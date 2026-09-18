"use client";

import React from "react";
import { ChefHat, Utensils, CheckCircle2, Flame, BellRing, ArrowRight } from "lucide-react";

interface KitchenTimelineProps {
  orderStatus: string;
  onAdvanceStatus: () => void;
  isProcessing: boolean;
}

export const KitchenTimeline: React.FC<KitchenTimelineProps> = ({
  orderStatus,
  onAdvanceStatus,
  isProcessing,
}) => {
  const steps = [
    { id: "confirmed", label: "Ticket Received", icon: BellRing, desc: "Order queued" },
    { id: "cooking", label: "Chef Cooking", icon: Flame, desc: "Wood-fire & prep" },
    { id: "ready", label: "Plated & Ready", icon: ChefHat, desc: "Quality inspected" },
    { id: "served", label: "Served at Table", icon: Utensils, desc: "Delivered fresh" },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "confirmed":
        return 0;
      case "cooking":
        return 1;
      case "ready":
        return 2;
      case "served":
        return 3;
      default:
        return -1;
    }
  };

  const currentIndex = getStepIndex(orderStatus);
  const isActive = currentIndex >= 0;

  if (!isActive) return null;

  return (
    <div className="bg-white rounded-3xl border border-artisan-sand shadow-card p-5 sm:p-6 space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-artisan-sand/60 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-artisan-terracotta text-white flex items-center justify-center shadow-sm">
            <ChefHat className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif text-base font-bold text-artisan-charcoal">
              Live Kitchen Pipeline
            </h4>
            <p className="text-xs text-artisan-muted">Real-Time Kitchen Dispatch Simulator</p>
          </div>
        </div>

        {orderStatus !== "served" && (
          <button
            onClick={onAdvanceStatus}
            disabled={isProcessing}
            className="self-start sm:self-auto px-3.5 py-1.5 bg-artisan-sand hover:bg-artisan-terracotta hover:text-white text-artisan-slate text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5"
          >
            <span>Advance Next Stage</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2 ${
                isCurrent
                  ? "bg-artisan-terracotta text-white border-artisan-terracotta shadow-glow"
                  : isDone
                  ? "bg-artisan-sageLight/70 border-emerald-300 text-emerald-900"
                  : "bg-artisan-cream/50 border-artisan-sand/70 text-artisan-muted opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <StepIcon
                  className={`w-5 h-5 ${
                    isCurrent
                      ? "text-white animate-bounce"
                      : isDone
                      ? "text-emerald-700"
                      : "text-artisan-muted"
                  }`}
                />
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                ) : isCurrent ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                ) : null}
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                  Stage 0{idx + 1}
                </span>
                <p className="text-xs font-bold leading-tight">{step.label}</p>
                <span className="text-[10px] opacity-80 block mt-0.5">{step.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
