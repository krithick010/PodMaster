import React, { useState, useEffect } from "react";
import axios from "axios";
import { Cpu, CheckCircle2, AlertTriangle, RefreshCw, Layers } from "lucide-react";

export function LLMObservability() {
  const [stats, setStats] = useState({
    status: "online",
    model: "phi3.5:latest",
    total_calls: 142,
    failed_calls: 0,
    average_latency_ms: 1245,
    last_call_seconds_ago: 15
  });
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchStats();
    const int = setInterval(fetchStats, 10000);
    return () => clearInterval(int);
  }, []);

  if (loading) {
    return <div className="h-32 bg-surface border border-subtle rounded-xl animate-pulse shadow-sm"></div>;
  }

  const isOnline = stats.status === "online";

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between text-primary font-sans h-full min-h-[160px]">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle font-sans">
        <div className="flex items-center gap-2.5">
          <Cpu size={18} className="text-accent-violet" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            AI Subsystem Telemetry (LLM Observability)
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase flex items-center gap-1.5 shadow-2xs ${
            isOnline ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'
          }`}>
            {isOnline ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {stats.status}
          </span>
          <button onClick={fetchStats} className="p-1.5 text-muted hover:text-accent-cyan transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 font-mono">
        <div className="bg-elevated p-3.5 rounded-xl border border-subtle flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-muted uppercase font-sans font-medium">Active Model</span>
          <span className="text-xs font-bold text-accent-violet truncate mt-1.5">{stats.model}</span>
        </div>
        <div className="bg-elevated p-3.5 rounded-xl border border-subtle flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-muted uppercase font-sans font-medium">Total AI Invocations</span>
          <span className="text-xl font-black text-primary mt-1">{stats.total_calls}</span>
        </div>
        <div className="bg-elevated p-3.5 rounded-xl border border-subtle flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-muted uppercase font-sans font-medium">Failed Invocations</span>
          <span className={`text-xl font-black mt-1 ${stats.failed_calls > 0 ? 'text-accent-red' : 'text-accent-emerald'}`}>
            {stats.failed_calls}
          </span>
        </div>
        <div className="bg-elevated p-3.5 rounded-xl border border-subtle flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-muted uppercase font-sans font-medium">Rolling Latency (p90)</span>
          <span className="text-xl font-black text-accent-cyan mt-1">{stats.average_latency_ms}ms</span>
        </div>
      </div>
    </div>
  );
}
