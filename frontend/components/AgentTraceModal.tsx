"use client";

import React from "react";
import { AgentTraceEvent } from "../types";
import { X, Cpu, GitFork, CheckCircle2, Clock, ShieldAlert, Sparkles, Activity } from "lucide-react";

interface AgentTraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: AgentTraceEvent[];
  activeStatus: string;
}

export const AgentTraceModal: React.FC<AgentTraceModalProps> = ({
  isOpen,
  onClose,
  traces,
  activeStatus,
}) => {
  if (!isOpen) return null;

  const graphNodes = [
    { id: "supervisor_router", name: "Supervisor Router", desc: "Intent Classifier" },
    { id: "rag_menu", name: "Qdrant RAG Engine", desc: "Vector Hybrid Search" },
    { id: "order_processing", name: "Order Processor", desc: "Pydantic Extraction" },
    { id: "validation_hitl", name: "Validation & HITL", desc: "Policy & Approval" },
    { id: "kitchen_dispatch", name: "Kitchen Dispatch", desc: "Order Cook Flow" },
    { id: "serving", name: "Service & Delivery", desc: "Table Delivery" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-3xl border border-artisan-sand shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-artisan-sand bg-gradient-to-r from-artisan-cream to-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-artisan-charcoal text-white flex items-center justify-center shadow-md">
              <Cpu className="w-5 h-5 text-artisan-amber" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-artisan-charcoal flex items-center gap-2">
                LangGraph Multi-Agent Architecture
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-artisan-sageLight text-emerald-800 border border-emerald-300">
                  Live Traces
                </span>
              </h3>
              <p className="text-xs text-artisan-muted">
                Stateful Graph Execution, Memory Checkpointing & HITL Interruption Gates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-artisan-muted hover:text-artisan-charcoal hover:bg-artisan-sand/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Graph Visual Pipeline */}
        <div className="p-5 border-b border-artisan-sand bg-artisan-cream/30 space-y-3">
          <h4 className="text-xs font-bold text-artisan-muted uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-artisan-terracotta" />
            Compiled Graph Topology
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center">
            {graphNodes.map((node, i) => (
              <div
                key={node.id}
                className="bg-white p-2.5 rounded-2xl border border-artisan-sand shadow-sm flex flex-col justify-between space-y-1 relative"
              >
                <span className="text-[10px] font-bold text-artisan-terracotta">Node 0{i + 1}</span>
                <p className="text-xs font-bold text-artisan-charcoal leading-tight">{node.name}</p>
                <span className="text-[10px] text-artisan-muted">{node.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Real-Time Trace Log */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <h4 className="text-xs font-bold text-artisan-muted uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-artisan-amber" />
            Session Event Stream ({traces.length} events logged)
          </h4>

          {traces.length === 0 ? (
            <div className="text-center py-10 text-artisan-muted text-xs">
              No agent trace events yet. Interact with the chat or order food to inspect live transitions!
            </div>
          ) : (
            <div className="relative border-l-2 border-artisan-sand ml-3 pl-4 space-y-4">
              {traces.map((ev, i) => (
                <div key={i} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full bg-artisan-terracotta border-2 border-white shadow-sm" />

                  <div className="bg-artisan-cream/50 hover:bg-artisan-cream p-3 rounded-2xl border border-artisan-sand/80 space-y-1 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-artisan-charcoal flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-artisan-terracotta" />
                        {ev.node}
                      </span>
                      <span className="text-[10px] text-artisan-muted font-mono">{ev.timestamp}</span>
                    </div>
                    <div className="text-xs font-semibold text-artisan-terracotta">{ev.action}</div>
                    <p className="text-xs text-artisan-slate leading-relaxed font-mono bg-white/80 p-2 rounded-xl border border-artisan-sand/60">
                      {ev.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-artisan-cream/40 border-t border-artisan-sand flex justify-between items-center text-xs text-artisan-muted">
          <span>Engineered with LangGraph 2.0 • Qdrant Vector DB</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-artisan-charcoal text-white font-semibold rounded-xl hover:bg-artisan-charcoal/90 transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
