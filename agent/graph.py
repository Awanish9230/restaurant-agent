from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from .state import RestaurantState
from .nodes import (
    supervisor_router_node,
    rag_menu_node,
    order_processing_node,
    validation_hitl_node,
    kitchen_dispatch_node,
    serving_node,
    general_chat_node
)


def route_supervisor(state: RestaurantState) -> str:
    """Route according to supervisor intent classification."""
    intent = state.get("order_status", "general_chat")
    if intent == "order_action":
        return "order_processing"
    elif intent == "menu_inquiry":
        return "rag_menu"
    elif intent == "confirm_order":
        return "validation_hitl"
    return "general_chat"


def route_after_hitl(state: RestaurantState) -> str:
    """Route after HITL validation node."""
    if state.get("hitl_required", False) or state.get("order_status") == "browsing":
        return END
    return "kitchen_dispatch"


def create_restaurant_graph(checkpointer=None):
    """Builds and compiles the full multi-agent stateful graph."""
    graph = StateGraph(RestaurantState)

    # Register Nodes
    graph.add_node("supervisor_router", supervisor_router_node)
    graph.add_node("rag_menu", rag_menu_node)
    graph.add_node("order_processing", order_processing_node)
    graph.add_node("general_chat", general_chat_node)
    graph.add_node("validation_hitl", validation_hitl_node)
    graph.add_node("kitchen_dispatch", kitchen_dispatch_node)
    graph.add_node("serving", serving_node)

    # Edges
    graph.add_edge(START, "supervisor_router")

    # Conditional Routing from Supervisor
    graph.add_conditional_edges(
        "supervisor_router",
        route_supervisor,
        {
            "order_processing": "order_processing",
            "rag_menu": "rag_menu",
            "validation_hitl": "validation_hitl",
            "general_chat": "general_chat"
        }
    )

    graph.add_edge("rag_menu", END)
    graph.add_edge("general_chat", END)
    graph.add_edge("order_processing", END)

    # Conditional Routing from Validation & HITL Gate
    graph.add_conditional_edges(
        "validation_hitl",
        route_after_hitl,
        {
            "kitchen_dispatch": "kitchen_dispatch",
            END: END
        }
    )

    graph.add_edge("kitchen_dispatch", "serving")
    graph.add_edge("serving", END)

    if checkpointer is None:
        checkpointer = MemorySaver()

    return graph.compile(checkpointer=checkpointer)


# Global default compiled graph with memory checkpointer
restaurant_app = create_restaurant_graph()