"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "../types";
import { Send, Bot, User, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface ChatAssistantProps {
  messages: ChatMessage[];
  suggestedPrompts: string[];
  isThinking: boolean;
  onSendMessage: (msg: string) => void;
  customerName?: string | null;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  messages,
  suggestedPrompts,
  isThinking,
  onSendMessage,
  customerName,
}) => {
  const [inputVal, setInputVal] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isThinking) return;
    onSendMessage(inputVal);
    setInputVal("");
  };

  return (
    <div className="bg-white rounded-3xl border border-artisan-sand shadow-card flex flex-col h-[600px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 sm:p-5 border-b border-artisan-sand/60 bg-gradient-to-r from-artisan-cream to-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-artisan-terracotta text-white flex items-center justify-center shadow-glow">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-artisan-charcoal">
              AI Maitre D' Concierge
            </h3>
            <p className="text-xs text-artisan-muted flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-artisan-sage mr-1.5 animate-pulse" />
              Stateful Multi-Turn • Qdrant RAG Enabled
            </p>
          </div>
        </div>
        {customerName && (
          <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-artisan-sand text-artisan-charcoal">
            Guest: {customerName}
          </span>
        )}
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-artisan-cream/30">
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
                {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-subtle ${
                  isUser
                    ? "bg-artisan-charcoal text-white rounded-tr-none"
                    : "bg-white text-artisan-charcoal border border-artisan-sand/80 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-artisan-terracotta text-white flex items-center justify-center shrink-0 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-artisan-sand/80 rounded-2xl rounded-tl-none p-3.5 text-xs text-artisan-muted flex items-center space-x-2">
              <span>Reasoning through LangGraph multi-agent pipeline...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      {suggestedPrompts && suggestedPrompts.length > 0 && (
        <div className="px-4 py-2 border-t border-artisan-sand/40 bg-white/70 overflow-x-auto flex gap-2 scrollbar-none">
          {suggestedPrompts.slice(0, 3).map((prompt, i) => (
            <button
              key={i}
              onClick={() => onSendMessage(prompt)}
              className="text-[11px] font-semibold bg-artisan-sand/60 hover:bg-artisan-amberLight text-artisan-slate hover:text-artisan-charcoal px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-3 h-3 text-artisan-terracotta" />
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3.5 sm:p-4 bg-white border-t border-artisan-sand">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type your order or ask questions (e.g. 'I want 2 burgers and cold brew, my name is Alex')..."
            className="flex-1 px-4 py-3 bg-artisan-cream/70 border border-artisan-sand rounded-2xl text-xs sm:text-sm text-artisan-charcoal placeholder-artisan-muted focus:outline-none focus:ring-2 focus:ring-artisan-terracotta/20 focus:border-artisan-terracotta transition-all"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isThinking}
            className="p-3 bg-artisan-terracotta hover:bg-artisan-terracottaHover disabled:opacity-50 text-white rounded-2xl shadow-glow transition-all active:scale-95 flex items-center justify-center shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
