import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitCommitVertical, ShieldAlert, AlertTriangle, Info, Sparkles } from "lucide-react";

export function AnomalyTimeline({ anomalies = [] }) {
  const sorted = [...anomalies]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 25);

  const getSeverity = (severity) => {
    switch (severity) {
      case "critical":
        return {
          icon: <ShieldAlert size={13} className="text-accent-red" />,
          dot: "bg-accent-red shadow-[0_0_8px_rgba(239,68,68,0.8)]",
          border: "border-accent-red/30",
          bg: "bg-accent-red/5",
          label: "bg-accent-red/20 text-accent-red",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={13} className="text-accent-amber" />,
          dot: "bg-accent-amber shadow-[0_0_8px_rgba(245,158,11,0.8)]",
          border: "border-accent-amber/30",
          bg: "bg-accent-amber/5",
          label: "bg-accent-amber/20 text-accent-amber",
        };
      default:
        return {
          icon: <Info size={13} className="text-accent-cyan" />,
          dot: "bg-accent-cyan shadow-[0_0_8px_rgba(6,182,212,0.6)]",
          border: "border-accent-cyan/20",
          bg: "bg-accent-cyan/5",
          label: "bg-accent-cyan/20 text-accent-cyan",
        };
    }
  };

  return (
    <div className="bg-bg-surface border border-subtle rounded-xl overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-subtle bg-gradient-to-r from-bg-elevated to-bg-surface">
        <div className="flex items-center gap-2">
          <GitCommitVertical size={16} className="text-accent-violet" />
          <h3 className="text-xs font-mono font-bold text-text-primary uppercase tracking-widest">
            Anomaly Timeline
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-text-muted">
            {sorted.length} events
          </span>
          {sorted.length > 0 && (
            <div className="w-1.5 h-1.5 rounded-full bg-accent-red pulse" />
          )}
        </div>
      </div>

      {/* Timeline Body */}
      <div className="p-4">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
            <ShieldAlert size={28} className="text-accent-emerald opacity-50" />
            <p className="text-xs font-mono text-accent-emerald">All systems nominal — no anomalies detected</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-accent-violet/40 via-bg-border to-transparent" />

            <AnimatePresence>
              <div className="space-y-3">
                {sorted.map((anomaly, idx) => {
                  const s = getSeverity(anomaly.severity);
                  return (
                    <motion.div
                      key={`${anomaly.timestamp}-${idx}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.025, duration: 0.25 }}
                      className="flex items-start gap-3 group"
                    >
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-1 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.dot} ring-2 ring-bg-surface`} />
                      </div>

                      {/* Card */}
                      <div className={`flex-1 rounded-lg border ${s.border} ${s.bg} px-3 py-2.5 transition-all group-hover:brightness-110`}>
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {s.icon}
                            <span className="text-xs font-mono font-bold text-text-primary truncate">
                              {anomaly.pod_name}
                            </span>
                            <span className={`hidden sm:inline text-[9px] font-mono px-1.5 py-0.5 rounded ${s.label} uppercase font-bold shrink-0`}>
                              {anomaly.severity}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted shrink-0">
                            {new Date(anomaly.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: false,
                            })}
                          </span>
                        </div>

                        <p className="text-[11px] text-text-secondary leading-relaxed">
                          {anomaly.description?.substring(0, 120)}
                          {anomaly.description?.length > 120 ? "…" : ""}
                        </p>

                        {anomaly.llm_insight && (
                          <div className="mt-2 flex items-start gap-1.5 pt-2 border-t border-white/5">
                            <Sparkles size={10} className="text-accent-violet mt-0.5 shrink-0" />
                            <p className="text-[10px] font-mono text-text-muted italic leading-relaxed line-clamp-2">
                              {anomaly.llm_insight.substring(0, 100)}…
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
