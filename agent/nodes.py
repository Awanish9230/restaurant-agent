import json
import os
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


def rag_menu_node(state: RestaurantState) -> Dict[str, Any]:
    """Semantic RAG node searching Qdrant vector database for menu answers."""
    user_msg = state["user_message"]
    trace = _log_trace(state, "Qdrant RAG Engine", "Vector Similarity Search", f"Searching vector index for: '{user_msg}'")

    # Search in Qdrant
    hits = rag_engine.search(user_msg, limit=4)
    if not hits:
        hits = rag_engine.get_all_menu()[:4]

    menu_context = "\n\n".join([
        f"Dish: {h['name']}\nCategory: {h['category']}\nPrice: Rs.{h['price']}\nDietary: {', '.join(h['dietary'])}\nSpicy: {h['spicy_level']}/3\nCalories: {h['calories']} kcal\nDescription: {h['description']}\nIngredients: {', '.join(h['ingredients'])}"
        for h in hits
    ])

    prompt = f"""You are the friendly, knowledgeable Maitre D' of 'GourmetAI Bistro'.
Answer the customer's query using the verified menu context below.

Customer Query: "{user_msg}"

Verified Menu Context:
{menu_context}

Guidelines:
1. Speak warmly and appetizingly.
2. Mention exact dish names and prices in Rs.
3. Highlight dietary perks (vegetarian, vegan, gluten-free) if asked.
4. Encourage them to add their favorite dish to their order!
"""

    response = llm.invoke([HumanMessage(content=prompt)]).content

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
    """Extracts dish items, handles typo resolution via RapidFuzz, and mutates cart state."""
    user_msg = state["user_message"]
    current_cart = list(state.get("cart", []))
    trace = _log_trace(state, "Order Processing Node", "Structured Entity Extraction", f"Extracting dish items from: '{user_msg}'")

    all_dishes = [item["name"] for item in rag_engine.get_all_menu()]

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
    ],
    "assistant_reply": "Short, cheerful confirmation of what was added or updated"
}}
"""
    try:
        res = llm.invoke([HumanMessage(content=prompt)]).content
        res_clean = res.replace("```json", "").replace("```", "").strip()
        data = json.loads(res_clean)
        actions = data.get("actions", [])
        assistant_reply = data.get("assistant_reply", "I've updated your order!")
        if data.get("customer_name") and not state.get("customer_name"):
            state["customer_name"] = data["customer_name"]
    except Exception:
        actions = []
        assistant_reply = "I've reviewed your request."

    # Process actions with Fuzzy matching
    for act in actions:
        item_raw = act.get("item_name", "")
        qty = act.get("quantity", 1)
        notes = act.get("notes") or ""

        matched = rag_engine.fuzzy_match_dish(item_raw)
        if not matched:
            continue

        slug = matched["slug"]
        name = matched["name"]
        price = matched["price"]

        if act.get("action") == "remove":
            current_cart = [i for i in current_cart if i["slug"] != slug]
        elif act.get("action") == "update":
            for i in current_cart:
                if i["slug"] == slug:
                    i["quantity"] = qty
                    if notes:
                        i["notes"] = notes
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

    subtotal, tax, total = _recalculate_cart_totals(current_cart)

    cart_summary = ", ".join([f"{i['quantity']}x {i['name']}" for i in current_cart])
    full_response = f"{assistant_reply}\n\n**Current Cart:** {cart_summary if cart_summary else 'Empty'}\n**Total:** Rs.{total}"

    return {
        "agent_trace": trace,
        "cart": current_cart,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "response": full_response,
        "order_status": "draft" if current_cart else "browsing",
        "suggested_prompts": [
            "Confirm and place order",
            "Add a cold beverage",
            "What desserts do you have?",
            "Clear my cart"
        ]
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
        reason = "High-value VIP order (Rs. 1000+) requiring final verification" if has_high_value else "Custom culinary preparation notes require kitchen confirmation"
        trace = _log_trace(state, "HITL Gate Interruption", "Awaiting Human Approval", reason)
        return {
            "agent_trace": trace,
            "hitl_required": True,
            "hitl_reason": reason,
            "order_status": "awaiting_approval",
            "response": f"⚠️ **Human-in-the-Loop Gate Triggered**: {reason}.\n\nPlease click **Confirm & Place Order** in the UI to proceed."
        }

    return {
        "agent_trace": trace,
        "hitl_required": False,
        "hitl_reason": None,
        "order_status": "confirmed",
        "response": f"🎉 **Order Confirmed!** Your order of Rs.{total} has been sent to the kitchen."
    }


def kitchen_dispatch_node(state: RestaurantState) -> Dict[str, Any]:
    """Simulates kitchen preparation workflow."""
    trace = _log_trace(state, "Kitchen Dispatch", "Order Preparation", "Chef received ticket. Preparing fresh ingredients.")
    return {
        "agent_trace": trace,
        "order_status": "cooking",
        "response": "👨‍🍳 **Kitchen Dispatch**: Your food is now being prepared fresh in the kitchen!"
    }


def serving_node(state: RestaurantState) -> Dict[str, Any]:
    """Final serving and completion node."""
    name = state.get("customer_name") or "Valued Guest"
    total = state.get("total", 0)
    trace = _log_trace(state, "Service & Delivery", "Plating & Delivery", f"Order served to {name}. Total: Rs.{total}")
    return {
        "agent_trace": trace,
        "order_status": "served",
        "response": f"🍽️ **Delivered!** Enjoy your meal, {name}! Total paid: Rs.{total}. Thank you for dining with GourmetAI Bistro."
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
"""
    response = llm.invoke([HumanMessage(content=prompt)]).content

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