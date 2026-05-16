import React from "react";
import { motion } from "framer-motion";
import { Cpu, Zap, Activity, Database, FileText, Clock, Copy, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

const AGENT_META = {
  cpu:        { label: "CPU Agent",        Icon: Cpu,      color: "#ef4444" },
  memory:     { label: "Memory Agent",     Icon: Zap,      color: "#f59e0b" },
  network:    { label: "Network Agent",    Icon: Activity, color: "#06b6d4" },
  storage:    { label: "Storage Agent",    Icon: Database, color: "#8b5cf6" },
  logio:      { label: "LogIO Agent",      Icon: FileText, color: "#f97316" },
  scheduling: { label: "Scheduling Agent", Icon: Clock,    color: "#10b981" },
};

const SEVERITY_CONFIG = {
  critical: { border: "#ef4444", badge: "#ef4444", label: "CRITICAL", Icon: AlertTriangle },
  warning:  { border: "#f59e0b", badge: "#f59e0b", label: "WARNING",  Icon: AlertTriangle },
  ok:       { border: "#10b981", badge: "#10b981", label: "OK",       Icon: ShieldCheck  },
  info:     { border: "#06b6d4", badge: "#06b6d4", label: "INFO",     Icon: ShieldCheck  },
  error:    { border: "#6b7280", badge: "#6b7280", label: "ERROR",    Icon: AlertTriangle },
};

export function AgentInsightCard({ domain, data, isLoading, index = 0 }) {
  const [copied, setCopied] = React.useState(false);
  const meta = AGENT_META[domain] || { label: domain, Icon: Activity, color: "#06b6d4" };
  const { Icon, label, color } = meta;

  const severity = data?.severity || "ok";
  const sev = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.ok;
  const SevIcon = sev.Icon;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div
        className="rounded-xl border animate-pulse"
        style={{ background: "#0d1117", borderColor: "#21262d", minHeight: 200 }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="rounded-xl border relative overflow-hidden flex flex-col"
      style={{
        background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
        borderColor: `${sev.border}30`,
        boxShadow: `inset 0 0 24px ${sev.border}06`,
      }}
    >
      {/* Left severity bar */}
      <div
        className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
        style={{ background: sev.border, opacity: 0.6 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/5 ml-1">
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            <Icon size={13} style={{ color }} />
          </div>
          <span className="text-[11px] font-mono font-bold text-gray-200 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <SevIcon size={10} style={{ color: sev.badge }} />
          <span
            className="text-[9px] font-mono font-black uppercase tracking-widest px-2 py-0.5 rounded"
            style={{ background: `${sev.badge}18`, color: sev.badge, border: `1px solid ${sev.badge}30` }}
          >
            {sev.label}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-3 ml-1 space-y-3">
        {/* Anomaly count */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Anomalies</span>
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{
              background: (data?.anomaly_count || 0) > 0 ? `${sev.badge}18` : "#ffffff08",
              color: (data?.anomaly_count || 0) > 0 ? sev.badge : "#6b7280",
            }}
          >
            {data?.anomaly_count ?? 0}
          </span>
        </div>

        {/* Insight */}
        {data?.insight && (
          <div
            className="rounded-lg p-2.5 border"
            style={{ background: "#0a0d12", borderColor: "#21262d" }}
          >
            <p className="text-[10px] font-mono text-gray-300 leading-relaxed">
              {data.insight}
            </p>
          </div>
        )}

        {/* Recommendation */}
        {data?.recommendation && (
          <div
            className="rounded-lg p-2.5 border relative"
            style={{ background: `${color}08`, borderColor: `${color}20` }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-mono leading-relaxed" style={{ color: `${color}cc` }}>
                <span className="font-bold" style={{ color }}>ACTION: </span>
                {data.recommendation}
              </p>
              <button
                onClick={() => handleCopy(data.recommendation)}
                className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                title="Copy recommendation"
              >
                {copied
                  ? <CheckCircle2 size={11} className="text-emerald-400" />
                  : <Copy size={11} className="text-gray-500" />
                }
              </button>
            </div>
          </div>
        )}

        {/* No issues state */}
        {!data?.insight && !data?.recommendation && (
          <div className="flex items-center gap-2 py-2">
            <ShieldCheck size={14} className="text-emerald-500/50" />
            <span className="text-[10px] font-mono text-gray-600">No issues detected</span>
          </div>
        )}
      </div>

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      />
    </motion.div>
  );
}
