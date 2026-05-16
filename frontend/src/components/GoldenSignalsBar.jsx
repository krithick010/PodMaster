import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Activity, AlertTriangle, Clock, Zap, Cpu, Sparkles } from "lucide-react";

export function GoldenSignalsBar() {
  const [signals, setSignals] = useState({
    traffic_rps: 0,
    error_rate: 0,
    latency_ms: 0,
    saturation: 0,
    status: "healthy",
    source: "prometheus"
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/signals/golden");
        setSignals(response.data);
      } catch (error) {
        console.error("Error fetching golden signals:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSignals();
    const interval = setInterval(fetchSignals, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status) => {
    switch(status) {
      case "critical": return { color: "#ef4444", label: "CRITICAL", bg: "rgba(239, 68, 68, 0.1)" };
      case "warning": return { color: "#f59e0b", label: "WARNING", bg: "rgba(245, 158, 11, 0.1)" };
      default: return { color: "#10b981", label: "HEALTHY", bg: "rgba(16, 185, 129, 0.1)" };
    }
  };

  if (loading) {
    return (
      <div className="bg-surface border border-subtle rounded-xl p-4 animate-pulse h-[88px] flex items-center px-8 gap-6 shadow-sm">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="flex-1 h-10 bg-elevated rounded-lg" />
        ))}
      </div>
    );
  }

  const throughput = signals.traffic_rps ?? signals.throughput ?? 0;
  const errorRate = signals.error_rate ?? signals.errorRate ?? 0;
  const latency = signals.latency_ms ?? signals.latency ?? 0;
  const saturation = signals.saturation ?? 0;
  const isDemo = signals.source === "simulated";
  const status = getStatusConfig(signals.status || "healthy");

  return (
    <div className="bg-surface border border-subtle rounded-xl shadow-sm relative overflow-hidden min-h-[92px] flex items-stretch text-primary">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-emerald opacity-80"></div>
      
      <div className="flex-1 flex flex-wrap lg:flex-nowrap divide-x divide-subtle">
        
        {/* Throughput */}
        <div className="flex-1 min-w-[140px] px-6 py-4 flex items-center gap-4 group hover:bg-elevated/40 transition-colors">
          <div className="p-3 bg-accent-cyan/10 rounded-xl text-accent-cyan group-hover:scale-110 transition-transform shadow-xs">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mb-1 font-mono">Throughput</p>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl font-black text-primary tracking-tight">
                {Number(throughput).toFixed(1)}
              </span>
              <span className="text-xs text-muted uppercase">rps</span>
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="flex-1 min-w-[140px] px-6 py-4 flex items-center gap-4 group hover:bg-elevated/40 transition-colors">
          <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform shadow-xs ${errorRate > 5 ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-amber/10 text-accent-amber'}`}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mb-1 font-mono">Error Rate</p>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl font-black text-primary tracking-tight">
                {Number(errorRate).toFixed(2)}
              </span>
              <span className="text-xs text-muted uppercase">%</span>
            </div>
          </div>
        </div>

        {/* Latency */}
        <div className="flex-1 min-w-[140px] px-6 py-4 flex items-center gap-4 group hover:bg-elevated/40 transition-colors">
          <div className="p-3 bg-accent-violet/10 rounded-xl text-accent-violet group-hover:scale-110 transition-transform shadow-xs">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mb-1 font-mono">Latency</p>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl font-black text-primary tracking-tight">
                {Number(latency).toFixed(0)}
              </span>
              <span className="text-xs text-muted uppercase">ms</span>
            </div>
          </div>
        </div>

        {/* Saturation */}
        <div className="flex-1 min-w-[140px] px-6 py-4 flex items-center gap-4 group hover:bg-elevated/40 transition-colors">
          <div className={`p-3 rounded-xl group-hover:scale-110 transition-transform shadow-xs ${saturation > 80 ? 'bg-accent-red/10 text-accent-red' : 'bg-accent-emerald/10 text-accent-emerald'}`}>
            <Cpu size={22} />
          </div>
          <div>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em] mb-1 font-mono">Saturation</p>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl font-black text-primary tracking-tight">
                {Number(saturation).toFixed(1)}
              </span>
              <span className="text-xs text-muted uppercase">%</span>
            </div>
          </div>
        </div>

        {/* System Status - Right Side */}
        <div className="flex-[0.9] px-6 py-4 flex flex-col justify-center items-center bg-elevated/30 border-l border-subtle relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 blur-[40px] opacity-15 pointer-events-none" style={{ backgroundColor: status.color }}></div>
          
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-2xs" style={{ borderColor: `${status.color}40`, backgroundColor: status.bg }}>
               <div className="w-2 h-2 rounded-full pulse" style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}` }}></div>
               <span className="text-xs font-mono font-bold tracking-wider" style={{ color: status.color }}>{status.label}</span>
            </div>

            {isDemo && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-violet/10 border border-accent-violet/30 rounded-full text-accent-violet text-[10px] font-mono font-bold uppercase tracking-wider shadow-2xs">
                <Sparkles size={12} className="text-accent-violet animate-spin" style={{ animationDuration: '4s' }} />
                DEMO MODE
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted uppercase tracking-wider mt-2">
            <Zap size={12} className="text-accent-cyan" />
            {isDemo ? "Simulated Telemetry Fallback" : "Live Kubelet BPF Stream"}
          </div>
        </div>

      </div>
    </div>
  );
}
