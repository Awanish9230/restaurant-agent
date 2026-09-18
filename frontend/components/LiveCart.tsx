"use client";

import React, { useState } from "react";
import { CartItem } from "../types";
import { ShoppingBag, Trash2, Plus, Minus, ShieldCheck, ArrowRight, ChefHat } from "lucide-react";

interface LiveCartProps {
  cart: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  orderStatus: string;
  onIncrement: (slug: string) => void;
  onDecrement: (slug: string) => void;
  onRemove: (slug: string) => void;
  onClear: () => void;
  onConfirmOrder: () => void;
  isProcessing: boolean;
}

export const LiveCart: React.FC<LiveCartProps> = ({
  cart,
  subtotal,
  tax,
  total,
  orderStatus,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onConfirmOrder,
  isProcessing,
}) => {
  const [diningMode, setDiningMode] = useState<"dine-in" | "takeaway">("dine-in");

  return (
    <div className="bg-white rounded-3xl border border-artisan-sand shadow-card p-5 sm:p-6 space-y-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-artisan-sand/60 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-artisan-sand flex items-center justify-center text-artisan-charcoal">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-artisan-charcoal">
              Order Summary
            </h3>
            <p className="text-xs text-artisan-muted">{cart.length} unique dish(es)</p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 flex items-center space-x-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Dining Mode Toggle */}
      <div className="grid grid-cols-2 gap-2 bg-artisan-cream p-1.5 rounded-2xl border border-artisan-sand text-xs font-semibold">
        <button
          onClick={() => setDiningMode("dine-in")}
          className={`py-2 rounded-xl transition-all ${
            diningMode === "dine-in"
              ? "bg-white text-artisan-charcoal shadow-sm"
              : "text-artisan-muted hover:text-artisan-charcoal"
          }`}
        >
          🍽️ Dine-in (Table #04)
        </button>
        <button
          onClick={() => setDiningMode("takeaway")}
          className={`py-2 rounded-xl transition-all ${
            diningMode === "takeaway"
              ? "bg-white text-artisan-charcoal shadow-sm"
              : "text-artisan-muted hover:text-artisan-charcoal"
          }`}
        >
          🛍️ Takeaway Box
        </button>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
        {cart.length === 0 ? (
          <div className="py-8 text-center text-artisan-muted space-y-2">
            <p className="text-sm">Your order is empty.</p>
            <p className="text-xs">Add dishes from the menu or chat with our AI assistant!</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.slug}
              className="p-3.5 rounded-2xl bg-artisan-cream/50 border border-artisan-sand/60 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-artisan-charcoal">
                    {item.name}
                  </h4>
                  <p className="text-xs text-artisan-muted">Rs.{item.price} each</p>
                </div>
                <span className="text-xs sm:text-sm font-bold text-artisan-charcoal">
                  Rs.{item.price * item.quantity}
                </span>
              </div>

              {item.notes && (
                <p className="text-[11px] text-artisan-terracotta bg-artisan-terracotta/10 px-2 py-0.5 rounded-md inline-block font-medium">
                  Note: {item.notes}
                </p>
              )}

              {/* Quantity Controls */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2 bg-white rounded-xl border border-artisan-sand p-0.5 shadow-sm">
                  <button
                    onClick={() => onDecrement(item.slug)}
                    className="w-6 h-6 rounded-lg text-artisan-muted hover:text-artisan-charcoal flex items-center justify-center hover:bg-artisan-sand transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-artisan-charcoal px-1.5">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onIncrement(item.slug)}
                    className="w-6 h-6 rounded-lg text-artisan-muted hover:text-artisan-charcoal flex items-center justify-center hover:bg-artisan-sand transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => onRemove(item.slug)}
                  className="text-xs text-artisan-muted hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bill Breakdown */}
      <div className="space-y-2 border-t border-artisan-sand/60 pt-4 text-xs">
        <div className="flex justify-between text-artisan-slate">
          <span>Subtotal</span>
          <span className="font-semibold">Rs.{subtotal}</span>
        </div>
        <div className="flex justify-between text-artisan-slate">
          <span>GST Tax (5%)</span>
          <span className="font-semibold">Rs.{tax}</span>
        </div>
        <div className="flex justify-between text-sm font-bold text-artisan-charcoal border-t border-artisan-sand pt-2">
          <span>Grand Total</span>
          <span className="text-artisan-terracotta text-base">Rs.{total}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        disabled={cart.length === 0 || isProcessing}
        onClick={onConfirmOrder}
        className="w-full py-3.5 px-4 bg-artisan-terracotta hover:bg-artisan-terracottaHover disabled:opacity-40 text-white font-bold text-sm rounded-2xl shadow-glow transition-all active:scale-98 flex items-center justify-center space-x-2"
      >
        <ChefHat className="w-4 h-4" />
        <span>Confirm & Send to Kitchen</span>
        <ArrowRight className="w-4 h-4 ml-1" />
      </button>

      <div className="flex items-center justify-center space-x-1 text-[11px] text-artisan-muted">
        <ShieldCheck className="w-3.5 h-3.5 text-artisan-sage" />
        <span>LangGraph Human-in-the-Loop Safeguards Active</span>
      </div>
    </div>
  );
};
