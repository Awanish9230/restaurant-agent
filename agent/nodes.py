import json
import os
import re
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

from .state import RestaurantState, OrderCartItem, AgentTraceEvent
from .rag import rag_engine

load_dotenv()

# Initialize LLM with fallback
MODEL_NAME = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
llm = ChatGroq(
    model=MODEL_NAME,
    temperature=0.2
)


def _log_trace(state: RestaurantState, node: str, action: str, details: str) -> List[AgentTraceEvent]:
    traces = list(state.get("agent_trace", []))
    traces.append({
        "node": node,
        "action": action,
        "details": details,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })
    return traces


def _recalculate_cart_totals(cart: List[OrderCartItem]) -> tuple[float, float, float]:
    subtotal = sum(item["price"] * item["quantity"] for item in cart)
    tax = round(subtotal * 0.05, 2)  # 5% GST
    total = round(subtotal + tax, 2)
    return subtotal, tax, total


def supervisor_router_node(state: RestaurantState) -> Dict[str, Any]:
    """Classifies user intent and routes to specialized subgraphs/nodes."""
    user_msg = state["user_message"]
    trace = _log_trace(state, "Supervisor Router", "Intent Classification", f"Analyzing customer message: '{user_msg}'")

    prompt = f"""You are the Master Concierge for 'GourmetAI Bistro'.
Analyze the customer's message and determine the primary intent.

Customer message: "{user_msg}"

Active Cart currently has: {len(state.get('cart', []))} items.

Return JSON ONLY in this format:
{{
    "intent": "order_action" | "menu_inquiry" | "confirm_order" | "general_chat",
    "customer_name": "string or null if not provided in message"
}}

Guidelines:
- "order_action": If customer mentions ordering, adding, removing, changing food/drinks or their name.
- "menu_inquiry": If customer asks what's on the menu, vegan/spicy dishes, recommendations, ingredients, prices.
- "confirm_order": If customer explicitly says 'confirm', 'checkout', 'place order', 'ready to pay', 'bill please'.
- "general_chat": Greetings like 'hello', 'thank you', 'how are you'.
"""
    try:
        res = llm.invoke([HumanMessage(content=prompt)]).content
        res_clean = res.replace("```json", "").replace("```", "").strip()
        data = json.loads(res_clean)
        intent = data.get("intent", "general_chat")
        extracted_name = data.get("customer_name")
    except Exception:
        intent = "general_chat"
        extracted_name = None

    customer_name = state.get("customer_name") or (extracted_name if extracted_name and extracted_name.lower() != "null" else None)

    return {
        "agent_trace": trace,
        "customer_name": customer_name,
        "order_status": intent  # temporary routing signal
    }


def _clean_text(text: str) -> str:
    """Removes raw markdown bold/italic asterisks and normalizes unicode characters for clean humanized chat."""
    clean = text.replace("\u202f", " ").replace("\xa0", " ").replace("\u2011", "-").replace("\u2013", "-").replace("\u2014", "-")
    clean = re.sub(r"\*\*([^*]+)\*\*", r"\1", clean)
    clean = re.sub(r"\*([^*]+)\*", r"\1", clean)
    clean = clean.replace("**", "").replace("*", "")
    return clean.strip()


def rag_menu_node(state: RestaurantState) -> Dict[str, Any]:
    """Semantic RAG node searching Qdrant vector database for menu answers."""
    user_msg = state["user_message"]
    trace = _log_trace(state, "Qdrant RAG Engine", "Vector Similarity Search", f"Searching vector index for: '{user_msg}'")

    # Search in Qdrant / Hybrid RAG
    hits = rag_engine.search(user_msg, limit=15)
    if not hits:
        hits = rag_engine.get_all_menu()

    menu_context = "\n\n".join([
        f"Dish: {h['name']}\nCategory: {h['category']}\nPrice: Rs.{h['price']}\nDietary: {', '.join(h['dietary'])}\nSpicy: {h['spicy_level']}/3\nCalories: {h['calories']} kcal\nDescription: {h['description']}\nIngredients: {', '.join(h['ingredients'])}"
        for h in hits
    ])

    prompt = f"""You are the friendly, knowledgeable Maitre D' of 'GourmetAI Bistro'.
Answer the customer's query accurately and comprehensively using ONLY the verified menu context below.

Customer Query: "{user_msg}"

Verified Menu Context:
{menu_context}

CRITICAL Guidelines:
1. When asked how many items or what varieties of an item exist (e.g. burgers, pizzas, pastas, drinks, desserts, or the full menu), you MUST list ALL matching items present in the Verified Menu Context. Do NOT omit any dishes.
2. For specific questions like 'how many types of burger do you have', state the exact count and describe each burger variety with its name, price, key ingredients, and dietary notes.
3. For full menu queries ('show me what is on the menu', 'what do you serve'), group and list all items categorized by Pizzas, Burgers, Pastas, Drinks, and Desserts with their prices.
4. Speak warmly, courteously, and appetizingly.
5. NEVER use asterisks (**) or markdown bold marks in your text. Keep the output clean, natural, and humanized.
6. End with a polite recommendation or invitation to add something to their order.
"""

    raw_response = llm.invoke([HumanMessage(content=prompt)]).content
    response = _clean_text(raw_response)

    prompts = [
        "Add 1 Margherita Pizza to my order",
        "What drinks pair well with burgers?",
        "Show me all vegetarian desserts",
        "Confirm my order"
    ]

    return {
        "agent_trace": trace,
        "response": response,
        "suggested_prompts": prompts,
        "order_status": state.get("order_status") if state.get("order_status") in ["draft", "awaiting_approval", "confirmed"] else "browsing"
    }


def order_processing_node(state: RestaurantState) -> Dict[str, Any]:
    """Extracts dish items, handles typo resolution via RapidFuzz, validates menu availability, and mutates cart state."""
    user_msg = state["user_message"]
    user_msg_lower = user_msg.lower().strip()
    current_cart = list(state.get("cart", []))
    trace = _log_trace(state, "Order Processing Node", "Structured Entity Extraction", f"Extracting dish items from: '{user_msg}'")

    all_menu_items = rag_engine.get_all_menu()
    all_dishes = [item["name"] for item in all_menu_items]

    # Handle bulk 'order all' requests
    if any(phrase in user_msg_lower for phrase in ["all item", "all items", "one of each", "every item", "order everything", "order all"]):
        current_cart = []
        for item in all_menu_items:
            current_cart.append({
                "slug": item["slug"],
                "name": item["name"],
                "price": item["price"],
                "quantity": 1,
                "notes": ""
            })
        subtotal, tax, total = _recalculate_cart_totals(current_cart)
        cart_summary = ", ".join([f"1x {i['name']}" for i in current_cart])
        full_response = f"All set! I've added one of each delicious dish from our menu to your order.\n\nCurrent Cart: {cart_summary}\nTotal: Rs.{total}"
        return {
            "agent_trace": trace,
            "cart": current_cart,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "response": _clean_text(full_response),
            "order_status": "draft",
            "suggested_prompts": [
                "Confirm and place order",
                "Add a cold beverage",
                "Clear my cart"
            ]
        }

    prompt = f"""You are an order extraction engine for a restaurant.
Extract all order actions from the customer message.

Customer Message: "{user_msg}"
Available Menu Names: {json.dumps(all_dishes)}

Return ONLY JSON in this format:
{{
    "customer_name": "name or null",
    "actions": [
        {{
            "action": "add" | "remove" | "update",
            "item_name": "raw dish name mentioned",
            "quantity": 1,
            "notes": "special instructions like no onions or null"
        }}
    ]
}}
"""
    try:
        res = llm.invoke([HumanMessage(content=prompt)]).content
        res_clean = res.replace("```json", "").replace("```", "").strip()
        data = json.loads(res_clean)
        actions = data.get("actions", [])
        if data.get("customer_name") and not state.get("customer_name"):
            state["customer_name"] = data["customer_name"]
    except Exception:
        actions = []

    added_items = []
    removed_items = []
    unavailable_items = []
    category_clarifications = []
    suggested_prompts_dynamic = []

    # Process actions with strict Fuzzy matching, disambiguation, & availability check
    for act in actions:
        item_raw = act.get("item_name", "").strip()
        qty = act.get("quantity", 1)
        notes = act.get("notes") or ""

        if not item_raw:
            continue

        # 1. Check if user mentioned a generic category (e.g. "pizza", "burger", "pasta", "dessert", "drink") with multiple options
        category_matches = rag_engine.get_category_matches(item_raw)
        if category_matches and len(category_matches) > 1:
            category_clarifications.append({
                "query": item_raw,
                "matches": category_matches
            })
            for m in category_matches[:4]:
                prompt_text = f"Add 1 {m['name']}"
                if prompt_text not in suggested_prompts_dynamic:
                    suggested_prompts_dynamic.append(prompt_text)
            continue

        matched = rag_engine.fuzzy_match_dish(item_raw, threshold=75)
        if not matched:
            unavailable_items.append(item_raw)
            continue

        slug = matched["slug"]
        name = matched["name"]
        price = matched["price"]

        if act.get("action") == "remove":
            current_cart = [i for i in current_cart if i["slug"] != slug]
            removed_items.append(name)
        elif act.get("action") == "update":
            for i in current_cart:
                if i["slug"] == slug:
                    i["quantity"] = qty
                    if notes:
                        i["notes"] = notes
            added_items.append(f"{qty}x {name}")
        else:  # add
            existing = next((i for i in current_cart if i["slug"] == slug), None)
            if existing:
                existing["quantity"] += qty
                if notes:
                    existing["notes"] = notes
            else:
                current_cart.append({
                    "slug": slug,
                    "name": name,
                    "price": price,
                    "quantity": qty,
                    "notes": notes
                })
            added_items.append(f"{qty}x {name}")

    # If no specific actions were matched, check if the user message itself asks for a generic category
    if not added_items and not removed_items and not unavailable_items and not category_clarifications:
        for cat_key in ["pizza", "burger", "pasta", "drink", "beverage", "coffee", "dessert"]:
            matches = rag_engine.get_category_matches(cat_key)
            if matches and (cat_key in user_msg_lower or f"{cat_key}s" in user_msg_lower):
                category_clarifications.append({
                    "query": cat_key,
                    "matches": matches
                })
                for m in matches[:4]:
                    prompt_text = f"Add 1 {m['name']}"
                    if prompt_text not in suggested_prompts_dynamic:
                        suggested_prompts_dynamic.append(prompt_text)
                break

    subtotal, tax, total = _recalculate_cart_totals(current_cart)
    cart_summary = ", ".join([f"{i['quantity']}x {i['name']}" for i in current_cart])

    # Craft accurate assistant response
    reply_parts = []
    if category_clarifications:
        for c in category_clarifications:
            options_list = "\n".join([f"- {m['name']} (Rs.{m['price']})" for m in c["matches"]])
            reply_parts.append(f"We have {len(c['matches'])} delicious {c['query']} varieties available:\n{options_list}\n\nWhich one would you like me to add for you?")
    if added_items:
        reply_parts.append(f"Added {', '.join(added_items)} to your order.")
    if removed_items:
        reply_parts.append(f"Removed {', '.join(removed_items)} from your cart.")
    if unavailable_items:
        unavail_str = ", ".join(unavailable_items)
        reply_parts.append(f"I'm sorry, we don't currently carry '{unavail_str}' on our menu.")
        # Offer close drink or dish alternatives
        if any(w in unavail_str.lower() for w in ["sprite", "soda", "pepsi", "fanta", "juice", "beverage", "drink"]):
            reply_parts.append("For refreshing drinks, we offer Heritage Cane Sugar Cola (Rs. 60), Wild Berry Sparkling Lemonade (Rs. 90), Kyoto Matcha Latte (Rs. 150), and Artisan Cold Brew Latte (Rs. 140)!")
        else:
            reply_parts.append("Feel free to explore our menu for wood-fired pizzas, smash burgers, and pastas!")

    if not reply_parts:
        reply_parts.append("I've reviewed your request.")

    full_response = f"{' '.join(reply_parts)}\n\nCurrent Cart: {cart_summary if cart_summary else 'Empty'}\nTotal: Rs.{total}"

    default_prompts = [
        "Confirm and place order",
        "Add a cold beverage",
        "What desserts do you have?",
        "Clear my cart"
    ]

    return {
        "agent_trace": trace,
        "cart": current_cart,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "response": _clean_text(full_response),
        "order_status": "draft" if current_cart else "browsing",
        "suggested_prompts": suggested_prompts_dynamic if suggested_prompts_dynamic else default_prompts
    }


def validation_hitl_node(state: RestaurantState) -> Dict[str, Any]:
    """Validates cart and triggers Human-In-The-Loop gate if total > Rs.1000 or custom instructions."""
    cart = state.get("cart", [])
    total = state.get("total", 0)
    trace = _log_trace(state, "Validation & HITL Gate", "Policy & Amount Check", f"Evaluating order validity. Total: Rs.{total}")

    if not cart:
        return {
            "agent_trace": trace,
            "response": "Your cart is currently empty. Please select dishes from our menu to place an order!",
            "order_status": "browsing"
        }

    # HITL condition: Orders over Rs. 1000 require manager / customer confirmation
    hitl_threshold = 1000.0
    has_high_value = total >= hitl_threshold
    has_special_notes = any(item.get("notes") for item in cart)

    if has_high_value or has_special_notes:
        reason = "High-value order (Rs. 1000+) requiring final verification" if has_high_value else "Custom culinary preparation notes require kitchen confirmation"
        trace = _log_trace(state, "HITL Gate Interruption", "Awaiting Human Approval", reason)
        return {
            "agent_trace": trace,
            "hitl_required": True,
            "hitl_reason": reason,
            "order_status": "awaiting_approval",
            "response": f"⚠️ Human-in-the-Loop Verification Required: {reason}.\n\nPlease click Confirm & Place Order in your order summary to proceed."
        }

    return {
        "agent_trace": trace,
        "hitl_required": False,
        "hitl_reason": None,
        "order_status": "confirmed",
        "response": f"🎉 Order Confirmed! Your order of Rs.{total} has been sent to the kitchen."
    }


def kitchen_dispatch_node(state: RestaurantState) -> Dict[str, Any]:
    """Simulates kitchen preparation workflow."""
    trace = _log_trace(state, "Kitchen Dispatch", "Order Preparation", "Chef received ticket. Preparing fresh ingredients.")
    return {
        "agent_trace": trace,
        "order_status": "cooking",
        "response": "👨‍🍳 Kitchen Dispatch: Your food is now being prepared fresh in the kitchen!"
    }


def serving_node(state: RestaurantState) -> Dict[str, Any]:
    """Final serving and completion node."""
    name = state.get("customer_name") or "Valued Guest"
    total = state.get("total", 0)
    trace = _log_trace(state, "Service & Delivery", "Plating & Delivery", f"Order served to {name}. Total: Rs.{total}")
    return {
        "agent_trace": trace,
        "order_status": "served",
        "response": f"🍽️ Delivered! Enjoy your meal, {name}! Total paid: Rs.{total}. Thank you for dining with GourmetAI Bistro."
    }


def general_chat_node(state: RestaurantState) -> Dict[str, Any]:
    """Handles warm conversational interactions and greetings."""
    user_msg = state["user_message"]
    name = state.get("customer_name")
    trace = _log_trace(state, "Concierge Chat", "Customer Engagement", "Crafting warm hospitality response.")

    prompt = f"""You are the warm, charming AI concierge of 'GourmetAI Bistro'.
Respond courteously and concisely to the customer's message: "{user_msg}"
Customer Name: {name or 'Valued Guest'}
Active Cart Items: {len(state.get('cart', []))}

Invite them to explore our wood-fired pizzas, gourmet smash burgers, artisanal pastas, and desserts!
Do NOT use asterisks (**) or markdown bold marks. Keep output clean and natural.
"""
    raw_response = llm.invoke([HumanMessage(content=prompt)]).content
    response = _clean_text(raw_response)

    return {
        "agent_trace": trace,
        "response": response,
        "suggested_prompts": [
            "Show me the available menu",
            "What are your top chef specials?",
            "I'd like 1 Margherita Pizza and 1 Coke",
            "Any spicy pasta available?"
        ]
    }