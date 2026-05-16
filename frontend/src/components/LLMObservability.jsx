import React, { useState, useEffect } from "react";
import axios from "axios";
import { Cpu, Clock, Activity, Zap } from "lucide-react";

export function LLMObservability() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/llm/stats");
        setStats(res.data);
      } catch (e) {
        console.error("Error fetching LLM stats", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const int = setInterval(fetchStats, 10000);
    return () => clearInterval(int);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border overflow-hidden animate-pulse" style={{ background: "#0d1117", borderColor: "#30363d", height: 120 }} />
    );
  }

  const isDegraded = !stats || stats.status !== "online";

  return (
    <div
      className="rounded-xl border overflow-hidden shadow-xl w-full"
      style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", borderColor: "#30363d" }}
    >
      {/* Violet top accent line */}
      <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, #a78bfa, transparent)" }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #21262d" }}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[11px]"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.25)" }}>
            🧠
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "#c9d1d9" }}>
              LLM Observability
            </div>
            <div className="text-[9px] font-mono" style={{ color: "#4b5563" }}>AI subsystem telemetry</div>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-mono font-bold uppercase"
          style={{
            background: isDegraded ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
            border: `1px solid ${isDegraded ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
            color: isDegraded ? "#ef4444" : "#10b981",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: isDegraded ? "#ef4444" : "#10b981", boxShadow: isDegraded ? "0 0 4px #ef4444" : "0 0 6px #10b981" }} />
          {isDegraded ? "DEGRADED" : "ONLINE"}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {isDegraded ? (
          <div className="text-[11px] font-mono text-center py-3 rounded"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444" }}>
            LLM engine unreachable · rule-based fallback active
          </div>
        ) : (
          /* 2-col grid — all 4 stats always visible */
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              { Icon: Cpu,      label: "Model",       value: stats?.model,                       color: "#06b6d4", truncate: true },
              { Icon: Activity, label: "Total Calls",  value: stats?.total_calls,                 color: "#10b981", truncate: false },
              { Icon: Clock,    label: "Avg Latency",  value: `${stats?.average_latency_ms ?? 0}ms`, color: "#f59e0b", truncate: false },
              { Icon: Zap,      label: "Last Call",    value: `${stats?.last_call_seconds_ago ?? 0}s ago`, color: "#8b949e", truncate: false },
            ].map(({ Icon, label, value, color, truncate }) => (
              <div key={label}>
                <div className="flex items-center gap-1 mb-0.5">
                  <Icon size={9} style={{ color: "#4b5563" }} />
                  <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: "#4b5563" }}>{label}</span>
                </div>
                <div className={`text-xs font-mono font-semibold ${truncate ? "truncate" : ""}`}
                  style={{ color, textShadow: `0 0 8px ${color}55` }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
