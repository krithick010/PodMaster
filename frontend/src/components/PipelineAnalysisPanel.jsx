import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitMerge, AlertTriangle, ShieldCheck, ChevronRight,
  Copy, CheckCircle2, Zap, ArrowRight,
} from "lucide-react";

const SEV_COLOR = {
  critical: "#ef4444",
  warning:  "#f59e0b",
  ok:       "#10b981",
  info:     "#06b6d4",
  error:    "#6b7280",
  unknown:  "#6b7280",
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
      title="Copy"
    >
      {copied
        ? <CheckCircle2 size={11} className="text-emerald-400" />
        : <Copy size={11} className="text-gray-500 hover:text-gray-300" />
      }
    </button>
  );
}

function SkeletonPanel() {
  return (
    <div
      className="rounded-xl border p-6 space-y-4 animate-pulse"
      style={{ background: "#0d1117", borderColor: "#21262d" }}
    >
      <div className="h-4 w-48 rounded bg-white/5" />
      <div className="h-3 w-full rounded bg-white/5" />
      <div className="h-3 w-3/4 rounded bg-white/5" />
      <div className="grid grid-cols-3 gap-3 pt-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-white/5" />
        ))}
      </div>
    </div>
  );
}

export function PipelineAnalysisPanel({ analysis, isLoading }) {
  if (isLoading) return <SkeletonPanel />;

  if (!analysis) {
    return (
      <div
        className="rounded-xl border p-8 flex flex-col items-center justify-center gap-3"
        style={{ background: "#0d1117", borderColor: "#21262d" }}
      >
        <GitMerge size={32} className="text-gray-700" />
        <p className="text-[11px] font-mono text-gray-600 uppercase tracking-widest text-center">
          Waiting for anomalies — pipeline runs automatically when issues are detected
        </p>
      </div>
    );
  }

  const sev = analysis.overall_severity || "unknown";
  const sevColor = SEV_COLOR[sev] || "#6b7280";
  const SevIcon = sev === "ok" ? ShieldCheck : AlertTriangle;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        borderColor: `${sevColor}30`,
        boxShadow: `inset 0 0 40px ${sevColor}05`,
      }}
    >
      {/* Top accent bar */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${sevColor}60, transparent)` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded" style={{ background: `${sevColor}15`, border: `1px solid ${sevColor}25` }}>
            <GitMerge size={14} style={{ color: sevColor }} />
          </div>
          <div>
            <h3 className="text-[11px] font-mono font-bold text-gray-200 uppercase tracking-widest">
              Coordinator Analysis
            </h3>
            <p className="text-[9px] font-mono text-gray-600 mt-0.5">MULTI-AGENT SYNTHESIS</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <SevIcon size={11} style={{ color: sevColor }} />
          <span
            className="text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ background: `${sevColor}18`, color: sevColor, border: `1px solid ${sevColor}30` }}
          >
            {sev}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* Executive Summary */}
        {analysis.summary && (
          <div>
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1.5">Executive Summary</p>
            <p className="text-[13px] text-gray-200 leading-relaxed font-medium">
              {analysis.summary}
            </p>
          </div>
        )}

        {/* Root Cause + Causal Chain */}
        {(analysis.root_cause || (analysis.causal_chain && analysis.causal_chain.length > 0)) && (
          <div
            className="rounded-lg p-3.5 border"
            style={{ background: `${sevColor}06`, borderColor: `${sevColor}20` }}
          >
            {analysis.root_cause && (
              <div className="mb-2">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest" style={{ color: sevColor }}>
                  Root Cause
                </span>
                <p className="text-[11px] font-mono text-gray-300 mt-1 leading-relaxed">
                  {analysis.root_cause}
                </p>
              </div>
            )}
            {analysis.causal_chain && analysis.causal_chain.length > 0 && (
              <div>
                <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Causal Chain</span>
                <div className="flex flex-wrap items-center gap-1 mt-1.5">
                  {analysis.causal_chain[0].split("→").map((step, i, arr) => (
                    <React.Fragment key={i}>
                      <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                        {step.trim()}
                      </span>
                      {i < arr.length - 1 && (
                        <ArrowRight size={10} className="text-gray-700 shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Actions */}
        {analysis.top_actions && analysis.top_actions.length > 0 && (
          <div>
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">Top Actions</p>
            <div className="space-y-2">
              {analysis.top_actions.map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 rounded-lg p-3 border"
                  style={{ background: "#0a0d12", borderColor: "#21262d" }}
                >
                  {/* Priority badge */}
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-[9px] font-mono font-black mt-0.5"
                    style={{ background: `${sevColor}20`, color: sevColor, border: `1px solid ${sevColor}30` }}
                  >
                    {action.priority || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-200 font-medium mb-1.5">{action.action}</p>
                    {action.command && (
                      <div className="flex items-center gap-2 bg-black/40 rounded border border-white/5 px-2.5 py-1.5">
                        <code className="text-[10px] font-mono text-emerald-400 truncate flex-1">
                          $ {action.command}
                        </code>
                        <CopyButton text={action.command} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Blast Radius */}
        {analysis.blast_radius && analysis.blast_radius.length > 0 && (
          <div>
            <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-2">Blast Radius</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.blast_radius.map((item, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-2 py-0.5 rounded border"
                  style={{ background: "#ef444410", borderColor: "#ef444430", color: "#ef4444cc" }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      />
    </motion.div>
  );
}
