import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Activity, AlertTriangle, Clock, Zap } from "lucide-react";

export function GoldenSignalsBar() {
  const [signals, setSignals] = useState({
    throughput: 0,
    errorRate: 0,
    latency: 0,
    status: "healthy"
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
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 animate-pulse h-[88px] flex items-center px-8 gap-6 shadow-xl">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 h-10 bg-[#161b22] rounded-lg" />
        ))}
      </div>
    );
  }

  const status = getStatusConfig(signals.status);

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-0 shadow-2xl relative overflow-hidden min-h-[92px] flex items-stretch">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#30363d] to-transparent opacity-50"></div>
      
      <div className="flex-1 flex divide-x divide-[#30363d]">
        
        {/* Throughput */}
        <div className="flex-1 px-6 py-4 flex items-center gap-4 group hover:bg-white/[0.02] transition-colors">
          <div className="p-2.5 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:scale-110 transition-transform">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-[0.2em] mb-1">Throughput</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-gray-100 tracking-tight">
                {signals.throughput.toFixed(1)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono uppercase">req/s</span>
            </div>
          </div>
        </div>

        {/* Error Rate */}
        <div className="flex-1 px-6 py-4 flex items-center gap-4 group hover:bg-white/[0.02] transition-colors">
          <div className={`p-2.5 rounded-lg group-hover:scale-110 transition-transform ${signals.errorRate > 5 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-[0.2em] mb-1">Error Rate</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-gray-100 tracking-tight">
                {signals.errorRate.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono uppercase">%</span>
            </div>
          </div>
        </div>

        {/* Latency */}
        <div className="flex-1 px-6 py-4 flex items-center gap-4 group hover:bg-white/[0.02] transition-colors">
          <div className="p-2.5 bg-violet-500/10 rounded-lg text-violet-400 group-hover:scale-110 transition-transform">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-[0.2em] mb-1">Avg Latency</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-black text-gray-100 tracking-tight">
                {signals.latency.toFixed(0)}
              </span>
              <span className="text-[10px] text-gray-500 font-mono uppercase">ms</span>
            </div>
          </div>
        </div>

        {/* System Status - Right Side */}
        <div className="flex-[0.8] px-6 flex flex-col justify-center bg-[#161b22]/30 border-l border-[#30363d] relative overflow-hidden">
          {/* Subtle status glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 blur-[40px] opacity-20 pointer-events-none" style={{ backgroundColor: status.color }}></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border mb-2" style={{ borderColor: `${status.color}33`, backgroundColor: status.bg }}>
               <div className="w-1.5 h-1.5 rounded-full pulse" style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}` }}></div>
               <span className="text-[10px] font-mono font-bold tracking-[0.15em]" style={{ color: status.color }}>{status.label}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-500 uppercase tracking-widest">
              <Zap size={10} className="text-cyan-500/50" />
              Real-time Sync
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
