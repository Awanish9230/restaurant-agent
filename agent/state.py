from typing import TypedDict, List, Dict, Any, Optional


class OrderCartItem(TypedDict):
    slug: str
    name: str
    price: float
    quantity: int
    notes: Optional[str]


class AgentTraceEvent(TypedDict):
    node: str
    action: str
    details: str
    timestamp: str


class RestaurantState(TypedDict):
    session_id: str
    user_message: str
    customer_name: Optional[str]
    messages: List[Dict[str, str]]
    cart: List[OrderCartItem]
    subtotal: float
    tax: float
    total: float
    order_status: str
    hitl_required: bool
    hitl_reason: Optional[str]
    agent_trace: List[AgentTraceEvent]
    response: str
    suggested_prompts: List[str]