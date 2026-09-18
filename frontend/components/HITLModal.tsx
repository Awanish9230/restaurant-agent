"use client";

import React from "react";
import { CartItem } from "../types";
import { ShieldAlert, Check, X, AlertTriangle, ChefHat } from "lucide-react";

interface HITLModalProps {
  isOpen: boolean;
  reason?: string | null;
  cart: CartItem[];
  total: number;
  onApprove: () => void;
  onReject: () => void;
  isProcessing: boolean;
}

export const HITLModal: React.FC<HITLModalProps> = ({
  isOpen,
  reason,
  cart,
  total,
  onApprove,
  onReject,
  isProcessing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-artisan-amber shadow-2xl overflow-hidden p-6 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center space-x-3 text-artisan-amber">
          <div className="w-12 h-12 rounded-2xl bg-artisan-amberLight flex items-center justify-center text-artisan-charcoal">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-artisan-charcoal">
              Human-in-the-Loop (HITL) Gate
            </h3>
            <p className="text-xs text-artisan-muted">LangGraph Interruption Protocol</p>
          </div>
        </div>

        {/* Reason Box */}
        <div className="bg-artisan-amberLight/60 border border-artisan-amber/40 rounded-2xl p-4 text-xs space-y-1.5 text-artisan-charcoal">
          <div className="font-bold flex items-center gap-1 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Verification Required:
          </div>
          <p className="text-amber-900 leading-relaxed font-medium">
            {reason || "This order requires customer/manager confirmation before kitchen dispatch."}
          </p>
        </div>

        {/* Order Summary in Modal */}
        <div className="space-y-2 border-t border-b border-artisan-sand py-3 text-xs max-h-40 overflow-y-auto">
          <span className="font-bold text-artisan-muted uppercase tracking-wider text-[10px]">
            Items for Authorization:
          </span>
          {cart.map((item) => (
            <div key={item.slug} className="flex justify-between items-center py-1">
              <span className="text-artisan-charcoal font-medium">
                {item.quantity}x {item.name}
              </span>
              <span className="font-bold text-artisan-charcoal">
                Rs.{item.price * item.quantity}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-artisan-sand font-bold text-sm">
            <span>Total to Authorize</span>
            <span className="text-artisan-terracotta text-base">Rs.{total}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={onReject}
            disabled={isProcessing}
            className="py-3 px-4 rounded-2xl bg-artisan-sand hover:bg-artisan-sand/80 text-artisan-slate font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Modify / Cancel</span>
          </button>
          <button
            onClick={onApprove}
            disabled={isProcessing}
            className="py-3 px-4 rounded-2xl bg-artisan-terracotta hover:bg-artisan-terracottaHover text-white font-bold text-xs shadow-glow flex items-center justify-center space-x-1.5 transition-all active:scale-98"
          >
            <Check className="w-4 h-4" />
            <span>Authorize & Cook</span>
          </button>
        </div>
      </div>
    </div>
  );
};
