"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, CartItem } from "../types";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  ArrowRight,
  ShoppingBag,
  ChefHat,
  PlusCircle,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  MessageSquare
} from "lucide-react";

interface ChatAssistantProps {
  messages: ChatMessage[];
  suggestedPrompts: string[];
  isThinking: boolean;
  onSendMessage: (msg: string) => void;
  customerName?: string | null;
  cart?: CartItem[];
  subtotal?: number;
  tax?: number;
  total?: number;
  orderStatus?: string;
  onConfirmOrder?: () => void;
  onClearCart?: () => void;
  onIncrement?: (slug: string) => void;
  onDecrement?: (slug: string) => void;
  onRemove?: (slug: string) => void;
  hitlRequired?: boolean;
  hitlReason?: string | null;
  onApproveHITL?: () => void;
  onRejectHITL?: () => void;
  isProcessing?: boolean;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  messages,
  suggestedPrompts,
  isThinking,
  onSendMessage,
  customerName,
  cart = [],
  subtotal = 0,
  tax = 0,
  total = 0,
  orderStatus = "browsing",
  onConfirmOrder,
  onClearCart,
  onIncrement,
  onDecrement,
  onRemove,
  hitlRequired = false,
  hitlReason = null,
  onApproveHITL,
  onRejectHITL,
  isProcessing = false,
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "cart">("chat");
  const [diningMode, setDiningMode] = useState<"dine-in" | "takeaway">("dine-in");
  const [inputVal, setInputVal] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll ONLY the chat container, preventing the entire browser window from jumping
  const scrollChatToBottom = () => {
    if (scrollContainerRef.current && activeTab === "chat") {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, isThinking, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isThinking) return;
    onSendMessage(inputVal);
    setInputVal("");
  };

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-white rounded-3xl border border-artisan-sand shadow-card flex flex-col h-[500px] sm:h-[530px] lg:h-[calc(100vh-140px)] max-h-[580px] min-h-[440px] overflow-hidden">
      {/* Unified Card Header with Inline Tab Switcher */}
      <div className="px-4 py-3 border-b border-artisan-sand/60 bg-gradient-to-r from-artisan-cream/90 to-white flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-artisan-terracotta text-white flex items-center justify-center shadow-sm shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-artisan-charcoal leading-tight">
              AI Maitre D'
            </h3>
            <p className="text-[10px] text-artisan-muted flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-artisan-sage mr-1 animate-pulse" />
              Qdrant RAG • LangGraph
            </p>
          </div>
        </div>

        {/* Header Tab Switcher */}
        <div className="flex items-center p-0.5 bg-artisan-sand/50 rounded-xl border border-artisan-sand/70">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
              activeTab === "chat"
                ? "bg-white text-artisan-charcoal shadow-sm"
                : "text-artisan-muted hover:text-artisan-charcoal"
            }`}
          >
            <MessageSquare className="w-3 h-3 text-artisan-terracotta" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveTab("cart")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
              activeTab === "cart"
                ? "bg-white text-artisan-charcoal shadow-sm"
                : "text-artisan-muted hover:text-artisan-charcoal"
            }`}
          >
            <ShoppingBag className="w-3 h-3 text-artisan-terracotta" />
            <span>Order</span>
            {totalItemsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-artisan-terracotta text-white rounded-full text-[9px] font-black">
                {totalItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: CHAT VIEW */}
      {activeTab === "chat" && (
        <>
          {/* Scrollable Message List */}
          <div
            ref={scrollContainerRef}
            className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 bg-artisan-cream/30"
          >
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] ${
                      isUser
                        ? "bg-artisan-charcoal text-white"
                        : "bg-artisan-terracotta text-white shadow-xs"
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3 h-3" />}
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-2.5 sm:p-3 text-xs leading-relaxed whitespace-pre-line shadow-subtle ${
                      isUser
                        ? "bg-artisan-charcoal text-white rounded-tr-none"
                        : "bg-white text-artisan-charcoal border border-artisan-sand/80 rounded-tl-none"
                    }`}
                  >
                    {msg.content.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1")}
                  </div>
                </div>
              );
            })}

            {/* Thinking indicator */}
            {isThinking && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-lg bg-artisan-terracotta text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-white border border-artisan-sand/80 rounded-2xl rounded-tl-none p-2.5 text-xs text-artisan-muted flex items-center space-x-1.5">
                  <span>Reasoning through LangGraph multi-agent pipeline...</span>
                </div>
              </div>
            )}
          </div>

          {/* HITL In-Chat Verification Banner */}
          {hitlRequired && (
            <div className="p-2.5 bg-amber-50 border-t border-amber-200 text-xs space-y-1.5 shrink-0">
              <div className="flex items-start space-x-1.5 text-amber-900 font-semibold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <span>Verification Required: {hitlReason || "High value order."}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onApproveHITL}
                  className="flex-1 py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center space-x-1 transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Approve & Place</span>
                </button>
                <button
                  onClick={onRejectHITL}
                  className="py-1.5 px-2.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-medium text-[11px] transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* In-Chat Order Action Bar */}
          {cart.length > 0 && !hitlRequired && (
            <div className="px-3 py-2 bg-artisan-cream/95 border-t border-artisan-sand space-y-1.5 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 font-bold text-artisan-charcoal text-[11px]">
                  <ShoppingBag className="w-3 h-3 text-artisan-terracotta" />
                  <span>Order ({totalItemsCount}):</span>
                  <span className="text-artisan-terracotta font-black">Rs.{total}</span>
                  <span className="text-[10px] text-artisan-muted font-normal">(inc. 5% tax)</span>
                </div>

                {onClearCart && (
                  <button
                    onClick={onClearCart}
                    className="text-[10px] text-red-500 hover:text-red-700 flex items-center space-x-0.5 font-semibold transition-colors"
                  >
                    <XCircle className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {onConfirmOrder && (
                  <button
                    onClick={onConfirmOrder}
                    disabled={isThinking}
                    className="flex-1 py-2 px-3 bg-artisan-terracotta hover:bg-artisan-terracottaHover disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1 shadow-glow transition-all active:scale-98"
                  >
                    <ChefHat className="w-3.5 h-3.5" />
                    <span>Place Order (Rs.{total})</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("cart")}
                  className="py-2 px-2.5 bg-white hover:bg-artisan-sand border border-artisan-sand text-artisan-charcoal rounded-xl font-semibold text-xs flex items-center space-x-1 transition-colors shrink-0"
                >
                  <ShoppingBag className="w-3 h-3 text-artisan-terracotta" />
                  <span>View Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* Suggested Quick Prompts */}
          {suggestedPrompts && suggestedPrompts.length > 0 && (
            <div className="px-3 py-1.5 border-t border-artisan-sand/40 bg-white/80 overflow-x-auto flex gap-1.5 scrollbar-none shrink-0">
              {suggestedPrompts.slice(0, 3).map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => onSendMessage(prompt)}
                  className="text-[10px] font-semibold bg-artisan-sand/60 hover:bg-artisan-amberLight text-artisan-slate hover:text-artisan-charcoal px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors flex items-center space-x-1 shrink-0"
                >
                  <span>{prompt}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-artisan-terracotta" />
                </button>
              ))}
            </div>
          )}

          {/* Pinned Input Form */}
          <form onSubmit={handleSubmit} className="p-2.5 sm:p-3 bg-white border-t border-artisan-sand shrink-0">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask AI or order (e.g. '2 burgers and cold brew')..."
                className="flex-1 px-3 py-2 bg-artisan-cream/70 border border-artisan-sand rounded-xl text-xs sm:text-sm text-artisan-charcoal placeholder-artisan-muted focus:outline-none focus:ring-2 focus:ring-artisan-terracotta/20 focus:border-artisan-terracotta transition-all"
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isThinking}
                className="p-2 bg-artisan-terracotta hover:bg-artisan-terracottaHover disabled:opacity-50 text-white rounded-xl shadow-glow transition-all active:scale-95 flex items-center justify-center shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </>
      )}

      {/* TAB 2: ORDER SUMMARY VIEW */}
      {activeTab === "cart" && (
        <div className="flex-1 min-h-0 flex flex-col justify-between p-4 space-y-3 overflow-hidden bg-white">
          {/* Dining Mode Toggle */}
          <div className="grid grid-cols-2 gap-1.5 bg-artisan-cream p-1 rounded-xl border border-artisan-sand text-xs font-semibold shrink-0">
            <button
              onClick={() => setDiningMode("dine-in")}
              className={`py-1.5 rounded-lg transition-all ${
                diningMode === "dine-in"
                  ? "bg-white text-artisan-charcoal shadow-xs"
                  : "text-artisan-muted hover:text-artisan-charcoal"
              }`}
            >
              🍽️ Table #04
            </button>
            <button
              onClick={() => setDiningMode("takeaway")}
              className={`py-1.5 rounded-lg transition-all ${
                diningMode === "takeaway"
                  ? "bg-white text-artisan-charcoal shadow-xs"
                  : "text-artisan-muted hover:text-artisan-charcoal"
              }`}
            >
              🛍️ Takeaway
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-artisan-muted space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-artisan-sand" />
                <p className="text-xs font-medium">Your cart is currently empty.</p>
                <button
                  onClick={() => setActiveTab("chat")}
                  className="text-xs text-artisan-terracotta font-bold underline"
                >
                  Ask AI Maitre D' for suggestions
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.slug}
                  className="p-2.5 rounded-xl bg-artisan-cream/50 border border-artisan-sand/60 space-y-1.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-artisan-charcoal">{item.name}</h4>
                      <p className="text-[10px] text-artisan-muted">Rs.{item.price} each</p>
                    </div>
                    <span className="text-xs font-bold text-artisan-charcoal">
                      Rs.{item.price * item.quantity}
                    </span>
                  </div>

                  {item.notes && (
                    <p className="text-[10px] text-artisan-terracotta bg-artisan-terracotta/10 px-1.5 py-0.5 rounded inline-block font-medium">
                      Note: {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-0.5">
                    <div className="flex items-center space-x-1.5 bg-white rounded-lg border border-artisan-sand p-0.5 shadow-xs">
                      <button
                        onClick={() => onDecrement && onDecrement(item.slug)}
                        className="w-5 h-5 rounded text-artisan-muted hover:text-artisan-charcoal flex items-center justify-center hover:bg-artisan-sand transition-colors"
                      >
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="text-xs font-bold text-artisan-charcoal px-1">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onIncrement && onIncrement(item.slug)}
                        className="w-5 h-5 rounded text-artisan-muted hover:text-artisan-charcoal flex items-center justify-center hover:bg-artisan-sand transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemove && onRemove(item.slug)}
                      className="text-xs text-artisan-muted hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Bill Summary & Action */}
          <div className="border-t border-artisan-sand/60 pt-2 space-y-1.5 shrink-0 text-xs">
            <div className="flex justify-between text-artisan-slate text-[11px]">
              <span>Subtotal</span>
              <span className="font-semibold">Rs.{subtotal}</span>
            </div>
            <div className="flex justify-between text-artisan-slate text-[11px]">
              <span>GST Tax (5%)</span>
              <span className="font-semibold">Rs.{tax}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-artisan-charcoal border-t border-artisan-sand pt-1.5">
              <span>Total</span>
              <span className="text-artisan-terracotta text-sm font-extrabold">Rs.{total}</span>
            </div>

            {onConfirmOrder && (
              <button
                disabled={cart.length === 0 || isProcessing}
                onClick={onConfirmOrder}
                className="w-full mt-2 py-2.5 px-3 bg-artisan-terracotta hover:bg-artisan-terracottaHover disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-glow transition-all active:scale-98 flex items-center justify-center space-x-1.5"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Confirm & Send to Kitchen</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
