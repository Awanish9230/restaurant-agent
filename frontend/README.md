# 🎨 ZaikaAI — Next.js 14 Light-Mode Frontend

A modern, 100% responsive, bespoke Light-Mode web application designed for the **ZaikaAI Agentic Dining & Ordering System**.

---

## ✨ Features & Highlights

- **Bespoke Artisan Light Theme**: Curated warm palette (Terracotta `#E05A47`, Artisan Amber `#F59E0B`, Soft Cream `#FAF7F2`, Sage `#10B981`) with glassmorphism and subtle elevation shadows.
- **Interactive Menu Explorer**:
  - Semantic search input integrated with Qdrant Hybrid RAG.
  - Category tabs (*All, Mains, Drinks, Desserts*).
  - Dietary filters (*Vegetarian, Vegan, Gluten-Free, Spicy*).
  - Appetizing dish cards with prep time, calories, star ratings, and instant add-to-cart.
  - "Ask AI about this dish" shortcut.
- **Multi-Turn AI Concierge Drawer**:
  - Live conversation with LangGraph stateful agent.
  - Dynamic suggested prompt chips.
  - Markdown message rendering and thinking indicators.
- **Dynamic Live Cart & Bill Breakdown**:
  - Real-time subtotal, 5% GST tax, and total calculation.
  - Dine-in (Table #04) vs Takeaway toggle.
  - Special preparation notes display.
- **LangGraph Visual Trace Inspector**:
  - Interactive modal displaying the compiled multi-agent topology (`Supervisor Router` $\rightarrow$ `Qdrant RAG` $\rightarrow$ `Order Processing` $\rightarrow$ `Validation/HITL` $\rightarrow$ `Kitchen Dispatch` $\rightarrow$ `Serving`).
  - Live timestamped event logs with node rationale.
- **Human-in-the-Loop (HITL) Gate**:
  - Interactive approval modal for high-value orders (Rs. 1000+) and custom culinary requests.
- **Live Kitchen Timeline**:
  - Animated step-by-step cooking and delivery tracker (*Ticket Received* $\rightarrow$ *Chef Cooking* $\rightarrow$ *Plated & Ready* $\rightarrow$ *Served*).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18, Tailwind CSS, Lucide React Icons
- **Typography**: Playfair Display (Serif headers) + Plus Jakarta Sans (Body)
- **State Management**: React Hooks + LocalStorage session persistence
- **API Client**: Native `fetch` with REST / JSON streaming integration

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Configure environment (points to FastAPI backend)
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Production Build & Deployment to Vercel

```bash
# Build production bundle
npm run build

# Start production server
npm run start
```

### Vercel Deployment:
1. Push to GitHub.
2. Import project into [Vercel](https://vercel.com).
3. Set **Root Directory** to `frontend`.
4. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`.
5. Click **Deploy**.
