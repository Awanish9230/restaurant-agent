import os
import json
import math
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, Range
from rapidfuzz import process, fuzz

MENU_PATH = Path(__file__).parent.parent / "menu.json"


class MenuRAG:
    """
    Production-grade RAG and Hybrid Vector Search Engine for Restaurant Menu.
    Supports:
    1. Qdrant Vector Search (Local in-memory ':memory:' or Qdrant Cloud Cluster)
    2. Dense TF-IDF / Normalized Term Vector Embeddings (ultra-fast, 0MB PyTorch overhead)
    3. RapidFuzz Typo-tolerant Lexical Matching
    4. Payload Filtering (Dietary, Category, Max Price, Spicy Level)
    """

    COLLECTION_NAME = "restaurant_menu"
    VECTOR_DIM = 64

    def __init__(self):
        self.menu_data: Dict[str, Any] = self._load_menu()
        self.vocabulary: List[str] = []
        self._build_vocabulary()
        
        # Initialize Qdrant Client (Dual-mode: Cloud or In-Memory)
        qdrant_url = os.getenv("QDRANT_URL")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")

        if qdrant_url and qdrant_api_key:
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            self.client = QdrantClient(":memory:")

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
        # Recreate collection
        try:
            self.client.delete_collection(collection_name=self.COLLECTION_NAME)
        except Exception:
            pass

        self.client.create_collection(
            collection_name=self.COLLECTION_NAME,
            vectors_config=VectorParams(size=self.VECTOR_DIM, distance=Distance.COSINE),
        )

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

    def fuzzy_match_dish(self, query: str, threshold: int = 50) -> Optional[Dict[str, Any]]:
        """Match typos and colloquial dish names (e.g. 'pzza' -> 'Artisan Margherita Pizza')."""
        query_clean = query.lower().strip()
        
        # Check exact match
        if query_clean in self.menu_data:
            return {"slug": query_clean, **self.menu_data[query_clean], "match_score": 100}

        best_score = 0
        best_dish = None

        for slug, item in self.menu_data.items():
            name = item["name"].lower()
            aliases = [a.lower() for a in item.get("aliases", [])]
            tokens = slug.split() + name.split()
            for a in aliases:
                tokens.extend(a.split())
            
            # Check full string similarity
            scores = [
                fuzz.WRatio(query_clean, slug),
                fuzz.WRatio(query_clean, name),
                fuzz.partial_ratio(query_clean, slug),
                fuzz.partial_ratio(query_clean, name)
            ]
            for a in aliases:
                scores.append(fuzz.WRatio(query_clean, a))
                scores.append(fuzz.ratio(query_clean, a))

            # Also check against individual word tokens (e.g. 'pzza' against 'pizza')
            for token in tokens:
                scores.append(fuzz.ratio(query_clean, token))
                scores.append(fuzz.WRatio(query_clean, token))

            max_dish_score = max(scores)
            if max_dish_score > best_score:
                best_score = max_dish_score
                best_dish = {"slug": slug, **item, "match_score": best_score}

        if best_score >= threshold and best_dish:
            return best_dish

        return None

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        dietary: Optional[str] = None,
        max_price: Optional[float] = None,
        limit: int = 4
    ) -> List[Dict[str, Any]]:
        """Hybrid Vector + Filter search in Qdrant."""
        query_vector = self._embed_text(query)
        
        # Build Qdrant filters
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

        # If vector search returned few results, supplement with fuzzy/keyword search
        if len(hits) < limit:
            fuzzy_item = self.fuzzy_match_dish(query)
            if fuzzy_item and not any(h["slug"] == fuzzy_item["slug"] for h in hits):
                hits.append(fuzzy_item)

        return hits[:limit]

    def get_all_menu(self) -> List[Dict[str, Any]]:
        return [{"slug": k, **v} for k, v in self.menu_data.items()]


# Global Singleton RAG instance
rag_engine = MenuRAG()
