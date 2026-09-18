import json
from pathlib import Path


MENU_PATH = Path(__file__).parent.parent / "menu.json"


def load_menu():
    with open(MENU_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


def check_item(item: str):

    menu = load_menu()

    item = item.lower().strip()

    if item in menu:
        return {
            "available": True,
            "price": menu[item]["price"]
        }

    return {
        "available": False,
        "price": None
    }


def calculate_total(order):

    menu = load_menu()

    total = 0

    for order_item in order:

        item = order_item["item"].lower()
        quantity = order_item["quantity"]

        if item in menu:
            total += menu[item]["price"] * quantity

    return total