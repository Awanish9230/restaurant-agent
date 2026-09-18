import sys
from dotenv import load_dotenv

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

from agent.graph import create_restaurant_graph

restaurant = create_restaurant_graph()


def main():

    print("=" * 50)
    print("       🍽️ AI RESTAURANT AGENT")
    print("=" * 50)

    user_message = input(
        "\n👤 Customer: "
    )

    initial_state = {
        "user_message": user_message,
        "order": [],
        "menu_valid": False,
        "unavailable_items": [],
        "total": 0,
        "status": "new",
        "response": ""
    }

    result = restaurant.invoke(
        initial_state
    )

    print()
    print("🤖 Restaurant:")
    print(result["response"])

    print()
    print("📦 Order Status:")
    print(result["status"])


if __name__ == "__main__":
    main()