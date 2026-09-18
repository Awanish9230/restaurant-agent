# AGENTS.md — ZaikaAI Restaurant Agent Workspace Context

This document provides concise, high-priority context for AI coding agents to understand the repository architecture, file mappings, state lifecycle, and conventions without needing to scan every file in the project.

---

## 🏛️ Project Architecture at a Glance

**ZaikaAI** is a production-grade full-stack Agentic AI restaurant ordering system:
- **Backend**: FastAPI (`api.py`) + LangGraph Stateful Graph (`agent/graph.py`) + Qdrant Hybrid RAG (`agent/rag.py`).
- **Frontend**: Next.js 14 App Router (`frontend/app/page.tsx`), TailwindCSS with bespoke warm artisan palette.
- **Data Source**: Enriched 18-dish menu (`menu.json`) with vegetarian, vegan, gluten-free tags, spicy levels, prep time, calories, and RapidFuzz aliases.

---

## 📁 Key File Index

| Component | Path | Responsibility |
| :--- | :--- | :--- |
| **FastAPI REST API** | [api.py](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/api.py) | `/api/health`, `/api/menu`, `/api/chat`, `/api/cart/action`, `/api/hitl/action`, `/api/kitchen/advance` |
| **LangGraph Topology** | [agent/graph.py](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/agent/graph.py) | Compiles `StateGraph(RestaurantState)` with `MemorySaver` thread checkpointing. |
| **Agent Nodes** | [agent/nodes.py](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/agent/nodes.py) | `supervisor_router_node`, `rag_menu_node`, `order_processing_node`, `policy_validation_node`, `kitchen_dispatch_node`, `serving_node`, `general_chat_node`. |
| **Qdrant & Fuzzy Engine** | [agent/rag.py](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/agent/rag.py) | Qdrant vector similarity, RapidFuzz token matching, typo tolerance, and generic category disambiguation (`pizza`, `burger`, `pasta`, `drink`, `dessert`). |
| **Shared State Schema** | [agent/state.py](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/agent/state.py) | `RestaurantState`, `CartItem`, `AgentTrace`, `ChatMessage`. |
| **Menu Dataset** | [menu.json](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/menu.json) | 18 dishes across Mains (Pizzas, Burgers, Pastas), Drinks, Desserts with prices in INR (Rs.). |
| **Next.js Main Dashboard** | [frontend/app/page.tsx](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/frontend/app/page.tsx) | Responsive 2-column layout, auto-polling health checks, Render cold-start alerts. |
| **AI Concierge Drawer** | [frontend/components/ChatAssistant.tsx](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/frontend/components/ChatAssistant.tsx) | Integrated Chat & Order inline tab switcher, suggested chips, quantity modification buttons. |
| **Menu Explorer Cards** | [frontend/components/MenuExplorer.tsx](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/frontend/components/MenuExplorer.tsx) | Filterable category tabs, dietary badges, live search, add-to-cart buttons. |
| **TypeScript Types** | [frontend/types/index.ts](file:///c:/Users/Awanish/Desktop/Main/Project/Restaurant-agent/frontend/types/index.ts) | Frontend interfaces matching `RestaurantState`. |

---

## ⚡ Agent Graph Lifecycle & Routing Rules

1. **Supervisor Router (`supervisor_router_node`)**:
   - Inspects customer message **and previous assistant message**.
   - Directs to:
     - `order_action` $\rightarrow$ dish ordering, adding, removing, multi-turn choice answers (e.g. `"wild pizza"` after asking which pizza), affirmations (`"yes"`, `"sure"`, `"add it"`).
     - `menu_inquiry` $\rightarrow$ questions about dishes, ingredients, recommendations, dietary options.
     - `confirm_order` $\rightarrow$ checkout, confirm, bill please.
     - `general_chat` $\rightarrow$ pure pleasantries without dish mentions.
2. **Order Processor (`order_processing_node`)**:
   - Extract dish entities via LLM + RapidFuzz fallback.
   - Disambiguates generic categories (e.g. asking which pizza when user says `"order 2 pizza"`).
   - Recalculates `subtotal`, `tax` (5% GST), `total`.
3. **Policy & HITL Gate (`policy_validation_node`)**:
   - Total $\ge$ Rs. 1000 triggers `hitl_required = True` (`"High-value order requires manager verification"`).
4. **Kitchen & Serving (`kitchen_dispatch_node` $\rightarrow$ `serving_node`)**:
   - Kitchen flow transitions: `confirmed` $\rightarrow$ `cooking` $\rightarrow$ `ready` $\rightarrow$ `served`.

---

## 🛠️ Local Development Commands

- **Backend** (port 8000):
  ```powershell
  python -m uvicorn api:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Frontend** (port 3000):
  ```powershell
  cd frontend ; npm run dev
  ```
- **Test Requests**:
  ```powershell
  python scratch/test_api_requests.py
  ```

---

## 🎯 Coding Conventions
- **Branding**: Always use **ZaikaAI** and **AI Zaika Concierge** (not foreign or old legacy names).
- **Text Formatting**: Never output markdown asterisks (`**bold**`) in chatbot output — `nodes.py` uses `_clean_text()` to ensure natural clean conversational responses.
- **Currency**: Indian Rupees format: `Rs.XXX` (e.g., `Rs.280`).
