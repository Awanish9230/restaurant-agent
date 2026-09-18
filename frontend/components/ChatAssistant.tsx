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
  CheckCircle2
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
  hitlRequired?: boolean;
  hitlReason?: string | null;
  onApproveHITL?: () => void;
  onRejectHITL?: () => void;
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
  hitlRequired = false,
  hitlReason = null,
  onApproveHITL,
  onRejectHITL,
}) => {
  const [inputVal, setInputVal] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll ONLY the chat container, preventing the entire browser window from jumping
  const scrollChatToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isThinking) return;
    onSendMessage(inputVal);
    setInputVal("");
  };

  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="bg-white rounded-3xl border border-artisan-sand shadow-card flex flex-col h-[520px] sm:h-[560px] lg:h-[calc(100vh-140px)] max-h-[640px] overflow-hidden">
      {/* Chat Header (Fixed at top of card) */}
      <div className="p-3.5 sm:p-4 border-b border-artisan-sand/60 bg-gradient-to-r from-artisan-cream to-white flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-artisan-terracotta text-white flex items-center justify-center shadow-glow shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-sm sm:text-base font-bold text-artisan-charcoal leading-tight">
              AI Maitre D' Concierge
            </h3>
            <p className="text-[11px] text-artisan-muted flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-artisan-sage mr-1.5 animate-pulse" />
              Stateful Multi-Turn • Qdrant RAG
            </p>
          </div>
        </div>
        {customerName && (
          <span className="px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-artisan-sand text-artisan-charcoal shrink-0">
            Guest: {customerName}
          </span>
        )}
      </div>

      {/* Message List (Scrollable Area - Constrained within frame) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-artisan-cream/30"
      >
        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                  isUser
                    ? "bg-artisan-charcoal text-white"
                    : "bg-artisan-terracotta text-white shadow-sm"
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-subtle ${
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
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-artisan-terracotta text-white flex items-center justify-center shrink-0 shadow-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="bg-white border border-artisan-sand/80 rounded-2xl rounded-tl-none p-3 text-xs text-artisan-muted flex items-center space-x-2">
              <span>Reasoning through LangGraph multi-agent pipeline...</span>
            </div>
          </div>
        )}
      </div>

      {/* HITL In-Chat Verification Banner */}
      {hitlRequired && (
        <div className="p-3 bg-amber-50 border-t border-amber-200 text-xs space-y-2 shrink-0">
          <div className="flex items-start space-x-2 text-amber-900 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="text-[11px]">Human Verification Required: {hitlReason || "High value or custom dish notes."}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onApproveHITL}
              className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve & Place Order</span>
            </button>
            <button
              onClick={onRejectHITL}
              className="py-2 px-3 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl font-medium text-xs transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* In-Chat Order Action Bar (Shows Total, Place Order, Add Items, Cancel) */}
      {cart.length > 0 && !hitlRequired && (
        <div className="p-2.5 sm:p-3 bg-artisan-cream/95 border-t border-artisan-sand space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-artisan-charcoal text-[11px] sm:text-xs">
              <ShoppingBag className="w-3.5 h-3.5 text-artisan-terracotta" />
              <span>Order ({totalItemsCount}):</span>
              <span className="text-artisan-terracotta font-extrabold">Rs.{total}</span>
              <span className="text-[10px] text-artisan-muted font-normal">(inc. 5% GST)</span>
            </div>

            {onClearCart && (
              <button
                onClick={onClearCart}
                className="text-[11px] text-red-500 hover:text-red-700 flex items-center space-x-1 font-semibold transition-colors"
              >
                <XCircle className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onConfirmOrder && (
              <button
                onClick={onConfirmOrder}
                disabled={isThinking}
                className="flex-1 py-2 px-3 bg-artisan-terracotta hover:bg-artisan-terracottaHover disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-glow transition-all active:scale-98"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Place Order (Rs.{total})</span>
              </button>
            )}

            <button
              onClick={() => onSendMessage("Show me what's on the menu")}
              disabled={isThinking}
              className="py-2 px-3 bg-white hover:bg-artisan-sand border border-artisan-sand text-artisan-charcoal rounded-xl font-semibold text-xs flex items-center space-x-1 transition-colors shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5 text-artisan-terracotta" />
              <span>Menu</span>
            </button>
          </div>
        </div>
      )}

      {/* Suggested Quick Prompts */}
      {suggestedPrompts && suggestedPrompts.length > 0 && (
        <div className="px-3.5 py-2 border-t border-artisan-sand/40 bg-white/80 overflow-x-auto flex gap-1.5 scrollbar-none shrink-0">
          {suggestedPrompts.slice(0, 3).map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(prompt)}
              className="text-[11px] font-semibold bg-artisan-sand/60 hover:bg-artisan-amberLight text-artisan-slate hover:text-artisan-charcoal px-2.5 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center space-x-1 shrink-0"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-3 h-3 text-artisan-terracotta" />
            </button>
          ))}
        </div>
      )}

      {/* Fixed Input Box at the Bottom of Card */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-3.5 bg-white border-t border-artisan-sand shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Ask AI or order (e.g. '2 burgers and coke')..."
            className="flex-1 px-3.5 py-2.5 bg-artisan-cream/70 border border-artisan-sand rounded-2xl text-xs sm:text-sm text-artisan-charcoal placeholder-artisan-muted focus:outline-none focus:ring-2 focus:ring-artisan-terracotta/20 focus:border-artisan-terracotta transition-all"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isThinking}
            className="p-2.5 bg-artisan-terracotta hover:bg-artisan-terracottaHover disabled:opacity-50 text-white rounded-2xl shadow-glow transition-all active:scale-95 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
