"use client";

import React from "react";
import { Utensils, RefreshCw, Cpu, Bot } from "lucide-react";

interface NavbarProps {
  backendHealthy: boolean;
  activeSessionId: string;
  onResetSession: () => void;
  onOpenTrace: () => void;
  cartCount: number;
  totalAmount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  backendHealthy,
  onResetSession,
  onOpenTrace,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-artisan-sand/80 shadow-subtle backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Clean Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-artisan-terracotta to-artisan-amber flex items-center justify-center shadow-glow text-white">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="font-serif text-2xl font-bold tracking-tight text-artisan-charcoal">
              Zaika<span className="text-artisan-terracotta">AI</span>
            </span>
          </div>

          {/* Clean Single-Word Controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Status */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 border border-artisan-sand shadow-sm text-artisan-slate">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealthy ? "bg-artisan-sage animate-pulse" : "bg-red-400"
                }`}
              />
              <span>{backendHealthy ? "Live" : "Offline"}</span>
            </div>

            {/* Quick Jump to AI Chat */}
            <button
              onClick={() => {
                document.getElementById("chat-assistant-panel")?.scrollIntoView({ behavior: "smooth" });
                const input = document.querySelector<HTMLInputElement>("#chat-assistant-panel input");
                input?.focus();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-artisan-terracotta text-white hover:bg-artisan-terracottaHover shadow-glow transition-all active:scale-95"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            {/* Trace Inspector */}
            <button
              onClick={onOpenTrace}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-artisan-sand/60 text-artisan-charcoal border border-artisan-sand transition-all shadow-sm active:scale-95"
            >
              <Cpu className="w-3.5 h-3.5 text-artisan-terracotta" />
              <span>Traces</span>
            </button>

            {/* Table Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-artisan-sand/80 text-xs font-semibold text-artisan-slate border border-artisan-sand hidden sm:block">
              Table 4
            </div>

            {/* Reset Button */}
            <button
              onClick={onResetSession}
              className="p-2 rounded-xl text-artisan-muted hover:text-artisan-charcoal hover:bg-artisan-sand/60 border border-artisan-sand/60 transition-colors"
              title="Reset"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
