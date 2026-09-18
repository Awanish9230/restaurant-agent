import os
import json
import math
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, Range
from rapidfuzz import process, fuzz

load_dotenv()

MENU_PATH = Path(__file__).parent.parent / "menu.json"


class MenuRAG:
    """
    Production-grade RAG and Hybrid Vector Search Engine for Restaurant Menu.
    Connected directly to Qdrant Cloud Cluster.
    """

    COLLECTION_NAME = "restaurant_menu"
    VECTOR_DIM = 64

    def __init__(self):
        self.menu_data: Dict[str, Any] = self._load_menu()
        self.vocabulary: List[str] = []
        self._build_vocabulary()
        
        # Initialize Qdrant Client (Using Qdrant Cloud Cluster)
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")

        if qdrant_url and qdrant_api_key:
            print(f"Connecting to Qdrant Cloud Cluster: {qdrant_url}")
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            raise ValueError("QDRANT_URL and QDRANT_API_KEY must be configured in .env for Qdrant Cloud Cluster.")

        self._initialize_vector_db()

    def _load_menu(self) -> Dict[str, Any]:
        with open(MENU_PATH, "r", encoding="utf-8") as f:
            return json.load(f)

    def _tokenize(self, text: str) -> List[str]:
        return re.findall(r"\b\w+\b", text.lower())

    def _build_vocabulary(self):
        all_words = set()
        for key, item in self.menu_data.items():
            corpus = f"{key} {item['name']} {item['category']} {item['description']} {' '.join(item['ingredients'])} {' '.join(item['dietary'])}"
            for word in self._tokenize(corpus):
                if len(word) > 2:
                    all_words.add(word)
        self.vocabulary = sorted(list(all_words))[: self.VECTOR_DIM]
        # Pad vocabulary if necessary
        while len(self.vocabulary) < self.VECTOR_DIM:
            self.vocabulary.append(f"_pad_{len(self.vocabulary)}")

    def _embed_text(self, text: str) -> List[float]:
        """Generate normalized bag-of-words / TF dense embedding vector."""
        tokens = self._tokenize(text)
        vector = [0.0] * self.VECTOR_DIM
        for t in tokens:
            if t in self.vocabulary:
                idx = self.vocabulary.index(t)
                vector[idx] += 1.0
        # L2 normalize vector
        norm = math.sqrt(sum(x * x for x in vector))
        if norm > 0:
            vector = [x / norm for x in vector]
        else:
            vector[0] = 1.0  # fallback unit vector
        return vector

    def _initialize_vector_db(self):
        try:
            exists = self.client.collection_exists(collection_name=self.COLLECTION_NAME)
            if not exists:
                self.client.create_collection(
                    collection_name=self.COLLECTION_NAME,
                    vectors_config=VectorParams(size=self.VECTOR_DIM, distance=Distance.COSINE),
                )
                self._upsert_all_points()
            else:
                info = self.client.get_collection(collection_name=self.COLLECTION_NAME)
                if (info.points_count or 0) < len(self.menu_data):
                    self._upsert_all_points()
        except Exception as e:
            # If any schema mismatch, recreate safely
            try:
                self.client.delete_collection(collection_name=self.COLLECTION_NAME)
                self.client.create_collection(
                    collection_name=self.COLLECTION_NAME,
                    vectors_config=VectorParams(size=self.VECTOR_DIM, distance=Distance.COSINE),
                )
                self._upsert_all_points()
            except Exception:
                pass

    def _upsert_all_points(self):
        points = []
        for idx, (slug, item) in enumerate(self.menu_data.items()):
            full_text = f"{item['name']} {item['category']} {item['description']} {' '.join(item['ingredients'])} {' '.join(item['dietary'])}"
            vector = self._embed_text(full_text)

            payload = {
                "slug": slug,
                "name": item["name"],
                "price": item["price"],
                "category": item["category"],
                "description": item["description"],
                "ingredients": item["ingredients"],
                "dietary": item["dietary"],
                "spicy_level": item["spicy_level"],
                "calories": item["calories"],
                "prep_time_mins": item["prep_time_mins"],
                "rating": item["rating"],
                "image": item["image"]
            }

            points.append(
                PointStruct(
                    id=idx + 1,
                    vector=vector,
                    payload=payload
                )
            )

        self.client.upsert(
            collection_name=self.COLLECTION_NAME,
            points=points
        )

    def fuzzy_match_dish(self, query: str, threshold: int = 72) -> Optional[Dict[str, Any]]:
        """Match typos, partial names, and colloquial dish names (e.g. 'smooky pizza' -> 'Smoky BBQ Paneer Pizza', 'pzza' -> 'Artisan Margherita Pizza') accurately."""
        query_clean = query.lower().strip()
        if not query_clean:
            return None

        # 1. Exact match by slug
        if query_clean in self.menu_data:
            return {"slug": query_clean, **self.menu_data[query_clean], "match_score": 100}

        # 2. Exact match in aliases
        for slug, item in self.menu_data.items():
            aliases = [a.lower() for a in item.get("aliases", [])]
            if query_clean in aliases:
                return {"slug": slug, **item, "match_score": 100}

        best_score = 0
        best_dish = None

        for slug, item in self.menu_data.items():
            name = item["name"].lower()
            aliases = [a.lower() for a in item.get("aliases", [])]

            # Full string & weighted token matching
            candidate_scores = [
                fuzz.WRatio(query_clean, slug),
                fuzz.WRatio(query_clean, name),
                fuzz.ratio(query_clean, slug),
                fuzz.ratio(query_clean, name),
                fuzz.token_sort_ratio(query_clean, name),
                fuzz.token_set_ratio(query_clean, name),
            ]

            # Alias matching
            for a in aliases:
                candidate_scores.append(fuzz.WRatio(query_clean, a))
                candidate_scores.append(fuzz.ratio(query_clean, a))
                candidate_scores.append(fuzz.token_sort_ratio(query_clean, a))

            dish_max = max(candidate_scores)
            if dish_max > best_score:
                best_score = dish_max
                best_dish = {"slug": slug, **item, "match_score": best_score}

        if best_score >= threshold and best_dish:
            return best_dish

        return None

    def get_category_matches(self, query: str) -> List[Dict[str, Any]]:
        """Finds all dish items belonging to a pure generic category noun (e.g. 'pizza', 'piiza', 'burger', 'pasta', 'drink', 'dessert')."""
        q = query.lower().strip()
        all_items = self.get_all_menu()

        # Generic category keywords and common typos
        generic_categories = {
            "pizza": ["pizza", "pizzas", "piiza", "pizaa", "pzza", "pizzza"],
            "burger": ["burger", "burgers", "burgur", "burgr"],
            "pasta": ["pasta", "pastas", "passta", "pazta"],
            "drink": ["drink", "drinks", "beverage", "beverages", "coffee", "cold drink", "cold drinks", "cha", "tea", "chai"],
            "dessert": ["dessert", "desserts", "sweet", "sweets", "ice cream", "icecream", "cake", "cakes"]
        }

        for cat_name, keywords in generic_categories.items():
            is_match = False
            if q in keywords or any(kw == q for kw in keywords):
                is_match = True
            elif any(fuzz.ratio(q, kw) >= 78 for kw in keywords):
                is_match = True

            if is_match:
                matches = []
                for item in all_items:
                    searchable = (item["name"] + " " + item["slug"] + " " + item.get("category", "") + " " + " ".join(item.get("aliases", []))).lower()
                    if cat_name == "drink" and item.get("category") == "drinks":
                        if item not in matches:
                            matches.append(item)
                    elif cat_name == "dessert" and item.get("category") == "desserts":
                        if item not in matches:
                            matches.append(item)
                    elif any(kw in searchable for kw in keywords):
                        if item not in matches:
                            matches.append(item)
                if len(matches) > 1:
                    return matches
        return []

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        dietary: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        """Hybrid Vector + Filter + Keyword search in Qdrant."""
        q_clean = query.lower().strip()
        all_items = self.get_all_menu()

        # 1. Full menu inquiry
        if any(w in q_clean for w in ["all", "menu", "everything", "options", "available", "full"]):
            # Filter if dietary or category specified
            filtered = all_items
            if category and category.lower() != "all":
                filtered = [i for i in filtered if i.get("category", "").lower() == category.lower()]
            if dietary:
                filtered = [i for i in filtered if dietary.lower() in [d.lower() for d in i.get("dietary", [])]]
            if max_price is not None:
                filtered = [i for i in filtered if i.get("price", 0) <= max_price]
            if filtered:
                return filtered[:limit]

        # 2. Match exact dish names, aliases, or category keywords (e.g. "lava cake", "tiramisu", "gelato", "burger", "pizza")
        matched_items = []

        # Direct dish name and alias match
        for item in all_items:
            for token in [item["name"].lower(), item["slug"].lower()] + [a.lower() for a in item.get("aliases", [])]:
                if token in q_clean or q_clean in token or fuzz.ratio(q_clean, token) >= 75:
                    if item not in matched_items:
                        matched_items.append(item)

        # Keyword / Category match
        keywords = ["burger", "pizza", "pasta", "drink", "coffee", "dessert", "desserts", "sweet", "sweets", "ice cream", "gelato", "lemonade", "cake", "tiramisu", "lava cake", "chocolate"]
        for kw in keywords:
            if kw in q_clean:
                for item in all_items:
                    name_slug = (item["name"] + " " + item["slug"] + " " + item.get("category", "") + " " + " ".join(item.get("aliases", []))).lower()
                    if kw in name_slug and item not in matched_items:
                        matched_items.append(item)

        if matched_items:
            return matched_items[:limit]

        # 3. Dense Vector search in Qdrant Cloud
        query_vector = self._embed_text(query)
        must_conditions = []
        if category and category.lower() != "all":
            must_conditions.append(FieldCondition(key="category", match=MatchValue(value=category.lower())))
        if dietary:
            must_conditions.append(FieldCondition(key="dietary", match=MatchValue(value=dietary.lower())))
        if max_price is not None:
            must_conditions.append(FieldCondition(key="price", range=Range(lte=max_price)))

        query_filter = Filter(must=must_conditions) if must_conditions else None

        try:
            results = self.client.search(
                collection_name=self.COLLECTION_NAME,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit
            )
            hits = [hit.payload for hit in results if hit.payload]
        except Exception:
            hits = []

        if not hits:
            hits = all_items[:6]

        return hits[:limit]

    def get_all_menu(self) -> List[Dict[str, Any]]:
        return [{"slug": k, **v} for k, v in self.menu_data.items()]


# Global Singleton RAG instance
rag_engine = MenuRAG()
