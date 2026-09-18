"use client";

import React, { useState, useEffect } from "react";
import { MenuItem, RestaurantState } from "../types";
import { Navbar } from "../components/Navbar";
import { MenuExplorer } from "../components/MenuExplorer";
import { ChatAssistant } from "../components/ChatAssistant";
import { LiveCart } from "../components/LiveCart";
import { AgentTraceModal } from "../components/AgentTraceModal";
import { HITLModal } from "../components/HITLModal";
import { KitchenTimeline } from "../components/KitchenTimeline";
import { Bot, ShoppingBag, Loader2, Zap } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [sessionId, setSessionId] = useState<string>("session-default");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>(["all"]);
  const [backendHealthy, setBackendHealthy] = useState<boolean>(false);
  const [isWakingUp, setIsWakingUp] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isTraceOpen, setIsTraceOpen] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"chat" | "cart">("chat");

  const [state, setState] = useState<RestaurantState>({
    session_id: "session-default",
    customer_name: null,
    user_message: "",
    messages: [
      {
        role: "assistant",
        content: "👋 Namaste & Welcome to ZaikaAI! I am your AI dining concierge. You can order dishes, ask about dietary ingredients, modify items, or explore chef specials. How can I serve you today?",
      },
    ],
    cart: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    order_status: "browsing",
    hitl_required: false,
    hitl_reason: null,
    agent_trace: [
      {
        node: "System Initialization",
        action: "State Checkpointer Ready",
        details: "LangGraph MemorySaver initialized with Qdrant collection 'restaurant_menu'",
        timestamp: "Ready",
      },
    ],
    response: "",
    suggested_prompts: [
      "Show me what's on the menu",
      "I'd like 1 Smoky BBQ Paneer Pizza & 1 Masala Chai",
      "Any pure vegetarian or vegan options?",
      "What are your top chef specials?",
    ],
  });

  // Generate unique session ID on client mount
  useEffect(() => {
    const saved = localStorage.getItem("zaika_session_id") || localStorage.getItem("gourmet_session_id");
    const newId = saved || `session-${Math.random().toString(36).substring(2, 9)}`;
    if (!saved) localStorage.setItem("zaika_session_id", newId);
    setSessionId(newId);
    setState((prev) => ({ ...prev, session_id: newId }));
  }, []);

  // Fetch initial menu & check backend health with auto-retry for Render cold starts
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let attempts = 0;

    const checkHealthAndMenu = async () => {
      attempts++;
      try {
        const healthRes = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
        if (healthRes.ok) {
          setBackendHealthy(true);
          setIsWakingUp(false);
          if (intervalId) clearInterval(intervalId);

          // Fetch full menu once health confirmed
          const menuRes = await fetch(`${API_BASE}/api/menu`);
          if (menuRes.ok) {
            const menuData = await menuRes.json();
            setMenuItems(menuData.items);
            setCategories(menuData.categories);
          }
          return;
        }
      } catch (err) {
        // Backend is either offline or waking up from Render free tier sleep
        setBackendHealthy(false);
        if (attempts > 0) {
          setIsWakingUp(true);
        }
      }
    };

    // Immediate first check
    checkHealthAndMenu();

    // Auto-poll every 3.5 seconds until backend wakes up
    intervalId = setInterval(checkHealthAndMenu, 3500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // Send message to LangGraph Chat API
  const handleSendMessage = async (msg: string) => {
    if (!msg.trim() || isThinking) return;
    setIsThinking(true);

    // Optimistic user message addition
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, { role: "user", content: msg }],
    }));

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: msg,
          customer_name: state.customer_name,
        }),
      });

      if (!res.ok) throw new Error("Failed to process message");
      const updatedState: RestaurantState = await res.json();
      setState(updatedState);
    } catch (err) {
      console.error("Chat error:", err);
      setState((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: "assistant",
            content: "⚠️ I encountered a temporary connection issue. Please make sure the FastAPI backend is running on port 8000.",
          },
        ],
      }));
    } finally {
      setIsThinking(false);
    }
  };

  // Mutate cart via API
  const handleCartAction = async (slug: string, action: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/cart/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          slug,
          action,
        }),
      });
      if (res.ok) {
        const updatedState: RestaurantState = await res.json();
        setState(updatedState);
      }
    } catch (err) {
      console.error("Cart action error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm order
  const handleConfirmOrder = () => {
    handleSendMessage("confirm my order and send to kitchen");
  };

  // HITL Approval
  const handleHITLAction = async (action: "approve" | "reject") => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/hitl/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          action,
        }),
      });
      if (res.ok) {
        const updatedState: RestaurantState = await res.json();
        setState(updatedState);
      }
    } catch (err) {
      console.error("HITL error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Advance Kitchen Status
  const handleAdvanceKitchen = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(`${API_BASE}/api/kitchen/advance?session_id=${sessionId}`, {
        method: "POST",
      });
      if (res.ok) {
        const updatedState: RestaurantState = await res.json();
        setState(updatedState);
      }
    } catch (err) {
      console.error("Kitchen error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset Session
  const handleResetSession = () => {
    const newId = `session-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem("gourmet_session_id", newId);
    setSessionId(newId);
    setState({
      session_id: newId,
      customer_name: null,
      user_message: "",
      messages: [
        {
          role: "assistant",
          content: "Welcome! A fresh dining session has started. How may I assist you today?",
        },
      ],
      cart: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      order_status: "browsing",
      hitl_required: false,
      hitl_reason: null,
      agent_trace: [
        {
          node: "Session Reset",
          action: "New Checkpoint State",
          details: `Initialized fresh memory thread '${newId}'`,
          timestamp: "Just now",
        },
      ],
      response: "",
      suggested_prompts: [
        "Show me what's on the menu",
        "I'd like 1 Margherita Pizza & 1 Coke",
        "What vegan options are available?",
        "What are your top chef specials?",
      ],
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-artisan-cream selection:bg-artisan-terracotta selection:text-white">
      {/* Navbar */}
      <Navbar
        backendHealthy={backendHealthy}
        activeSessionId={sessionId}
        onResetSession={handleResetSession}
        onOpenTrace={() => setIsTraceOpen(true)}
        cartCount={state.cart.reduce((acc, item) => acc + item.quantity, 0)}
        totalAmount={state.total}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Render Free-Tier Cold Start Alert */}
        {!backendHealthy && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 shadow-sm flex items-center justify-between animate-fadeIn transition-all">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center">
                  <span>Waking up Cloud AI Server</span>
                  <Loader2 className="w-3.5 h-3.5 ml-2 animate-spin text-amber-700" />
                </h4>
                <p className="text-[11px] sm:text-xs text-amber-700 font-medium">
                  Render's free tier server spins down when idle. It takes ~30–45 seconds on first visit. Automatically connecting...
                </p>
              </div>
            </div>
            <span className="hidden md:inline-block px-2.5 py-1 bg-white/90 rounded-lg text-[10px] font-bold text-amber-800 border border-amber-200 shrink-0">
              Auto-Polling
            </span>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (Menu & Kitchen Pipeline) - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* Live Kitchen Timeline (renders if order is confirmed/cooking/served) */}
            <KitchenTimeline
              orderStatus={state.order_status}
              onAdvanceStatus={handleAdvanceKitchen}
              isProcessing={isProcessing}
            />

            {/* Menu Explorer */}
            <MenuExplorer
              items={menuItems}
              categories={categories}
              cart={state.cart}
              onAddToCart={(slug) => handleCartAction(slug, "add")}
              onIncrement={(slug) => handleCartAction(slug, "increment")}
              onDecrement={(slug) => handleCartAction(slug, "decrement")}
              onAskAI={(prompt) => handleSendMessage(prompt)}
            />
          </div>

          {/* Right Column (Single-Frame AI Concierge & Cart Dashboard) - 5 cols */}
          <div className="lg:col-span-5 lg:sticky lg:top-20">
            <div id="chat-assistant-panel" className="scroll-mt-24">
              <ChatAssistant
                messages={state.messages}
                suggestedPrompts={state.suggested_prompts}
                isThinking={isThinking}
                onSendMessage={handleSendMessage}
                customerName={state.customer_name}
                cart={state.cart}
                subtotal={state.subtotal}
                tax={state.tax}
                total={state.total}
                orderStatus={state.order_status}
                onConfirmOrder={handleConfirmOrder}
                onClearCart={() => handleCartAction("", "clear")}
                onIncrement={(slug) => handleCartAction(slug, "increment")}
                onDecrement={(slug) => handleCartAction(slug, "decrement")}
                onRemove={(slug) => handleCartAction(slug, "remove")}
                hitlRequired={state.hitl_required}
                hitlReason={state.hitl_reason}
                onApproveHITL={() => handleHITLAction("approve")}
                onRejectHITL={() => handleHITLAction("reject")}
                isProcessing={isProcessing || isThinking}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Floating Action Button on Mobile/Tablet to Jump Directly to Chat */}
      <button
        onClick={() => {
          document.getElementById("chat-assistant-panel")?.scrollIntoView({ behavior: "smooth" });
          const input = document.querySelector<HTMLInputElement>("#chat-assistant-panel input");
          input?.focus();
        }}
        className="fixed bottom-6 right-6 z-40 lg:hidden flex items-center space-x-2 bg-artisan-terracotta hover:bg-artisan-terracottaHover text-white px-4 py-3 rounded-full shadow-glow active:scale-95 transition-all text-xs font-bold"
      >
        <span className="w-2 h-2 rounded-full bg-artisan-sage animate-pulse" />
        <span>💬 Ask AI Concierge</span>
      </button>

      {/* Modals */}
      <AgentTraceModal
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        traces={state.agent_trace}
        activeStatus={state.order_status}
      />

      <HITLModal
        isOpen={state.hitl_required}
        reason={state.hitl_reason}
        cart={state.cart}
        total={state.total}
        onApprove={() => handleHITLAction("approve")}
        onReject={() => handleHITLAction("reject")}
        isProcessing={isProcessing}
      />
    </div>
  );
}
