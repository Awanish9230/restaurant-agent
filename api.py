import os
import sys
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure local imports work cleanly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

from agent.graph import restaurant_app
from agent.rag import rag_engine
from agent.state import RestaurantState

app = FastAPI(
    title="GourmetAI Bistro - Agentic API",
    description="Multi-Agent LangGraph Backend with Qdrant Vector RAG and HITL Gate",
    version="2.0.0"
)

# Enable CORS for Next.js frontend (local and Vercel deployments)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory session store cache for quick retrieval
SESSION_STATE_CACHE: Dict[str, RestaurantState] = {}


class ChatRequest(BaseModel):
    session_id: str
    message: str
    customer_name: Optional[str] = None


class CartItemAction(BaseModel):
    session_id: str
    slug: str
    action: str  # "add", "increment", "decrement", "remove", "clear"
    notes: Optional[str] = None


class HITLAction(BaseModel):
    session_id: str
    action: str  # "approve" or "reject"
    notes: Optional[str] = None


def _get_or_create_state(session_id: str, customer_name: Optional[str] = None) -> RestaurantState:
    if session_id in SESSION_STATE_CACHE:
        state = SESSION_STATE_CACHE[session_id]
        if customer_name and not state.get("customer_name"):
            state["customer_name"] = customer_name
        return state

    initial_state: RestaurantState = {
        "session_id": session_id,
        "user_message": "",
        "customer_name": customer_name,
        "messages": [],
        "cart": [],
        "subtotal": 0.0,
        "tax": 0.0,
        "total": 0.0,
        "order_status": "browsing",
        "hitl_required": False,
        "hitl_reason": None,
        "agent_trace": [],
        "response": "Welcome to GourmetAI Bistro! I am your AI concierge. How may I delight your palate today?",
        "suggested_prompts": [
            "Show me chef specials",
            "I'd like 1 Margherita Pizza & 1 Coke",
            "What vegan options are available?",
            "Any spicy pasta under Rs. 250?"
        ]
    }
    SESSION_STATE_CACHE[session_id] = initial_state
    return initial_state


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GourmetAI Bistro Agent Backend",
        "version": "2.0.0",
        "qdrant_status": "connected",
        "model": os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    }


@app.get("/api/menu")
def get_menu():
    dishes = rag_engine.get_all_menu()
    categories = sorted(list(set(d["category"] for d in dishes)))
    return {
        "items": dishes,
        "categories": ["all"] + categories,
        "total_items": len(dishes)
    }


@app.get("/api/menu/search")
def search_menu(
    q: str = "",
    category: Optional[str] = None,
    dietary: Optional[str] = None,
    max_price: Optional[float] = None
):
    results = rag_engine.search(
        query=q if q else "popular dish",
        category=category,
        dietary=dietary,
        max_price=max_price,
        limit=8
    )
    return {"results": results, "query": q}


@app.get("/api/state/{session_id}")
def get_session_state(session_id: str):
    state = _get_or_create_state(session_id)
    return state


@app.post("/api/chat")
def chat_with_agent(req: ChatRequest):
    current_state = _get_or_create_state(req.session_id, req.customer_name)
    
    # Update state message
    current_state["user_message"] = req.message
    current_state["messages"].append({"role": "user", "content": req.message})

    config = {"configurable": {"thread_id": req.session_id}}

    try:
        updated_state = restaurant_app.invoke(current_state, config)
        
        # Save bot response to chat history
        if updated_state.get("response"):
            updated_state["messages"].append({
                "role": "assistant",
                "content": updated_state["response"]
            })

        SESSION_STATE_CACHE[req.session_id] = updated_state
        return updated_state
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cart/action")
def mutate_cart(req: CartItemAction):
    state = _get_or_create_state(req.session_id)
    cart = list(state.get("cart", []))
    
    if req.action == "clear":
        cart = []
    else:
        matched = rag_engine.fuzzy_match_dish(req.slug)
        if not matched:
            raise HTTPException(status_code=404, detail="Dish not found in menu")

        slug = matched["slug"]
        name = matched["name"]
        price = matched["price"]

        existing = next((i for i in cart if i["slug"] == slug), None)

        if req.action in ["add", "increment"]:
            if existing:
                existing["quantity"] += 1
            else:
                cart.append({
                    "slug": slug,
                    "name": name,
                    "price": price,
                    "quantity": 1,
                    "notes": req.notes or ""
                })
        elif req.action == "decrement":
            if existing:
                if existing["quantity"] > 1:
                    existing["quantity"] -= 1
                else:
                    cart = [i for i in cart if i["slug"] != slug]
        elif req.action == "remove":
            cart = [i for i in cart if i["slug"] != slug]

    # Recalculate totals
    subtotal = sum(item["price"] * item["quantity"] for item in cart)
    tax = round(subtotal * 0.05, 2)
    total = round(subtotal + tax, 2)

    state["cart"] = cart
    state["subtotal"] = subtotal
    state["tax"] = tax
    state["total"] = total
    state["order_status"] = "draft" if cart else "browsing"

    SESSION_STATE_CACHE[req.session_id] = state
    return state


@app.post("/api/hitl/action")
def handle_hitl_action(req: HITLAction):
    state = _get_or_create_state(req.session_id)
    
    if req.action == "approve":
        state["hitl_required"] = False
        state["hitl_reason"] = None
        state["order_status"] = "cooking"
        state["response"] = "👨‍🍳 **Order Approved & Dispatched!** The kitchen has started preparing your gourmet meal."
        state["agent_trace"].append({
            "node": "HITL Approval Gate",
            "action": "Human Authorization",
            "details": "Order confirmed by user/manager. Kitchen dispatched.",
            "timestamp": "Just now"
        })
    else:
        state["hitl_required"] = False
        state["hitl_reason"] = None
        state["order_status"] = "draft"
        state["response"] = "Order was adjusted or cancelled. You can continue modifying your cart."

    SESSION_STATE_CACHE[req.session_id] = state
    return state


@app.post("/api/kitchen/advance")
def advance_kitchen_status(session_id: str):
    state = _get_or_create_state(session_id)
    status_flow = {
        "confirmed": "cooking",
        "cooking": "ready",
        "ready": "served",
        "served": "served"
    }
    next_status = status_flow.get(state.get("order_status", "confirmed"), "cooking")
    state["order_status"] = next_status

    if next_status == "served":
        name = state.get("customer_name") or "Valued Guest"
        state["response"] = f"🍽️ **Delivered!** Enjoy your exquisite meal, {name}! Thank you for dining with GourmetAI Bistro."

    SESSION_STATE_CACHE[session_id] = state
    return state


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
