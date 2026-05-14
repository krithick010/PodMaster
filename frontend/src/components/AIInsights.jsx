import React, { useState, useEffect } from "react";
import axios from "axios";
import { Sparkles, AlertCircle, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AIInsights({ namespace }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/anomalies/current?namespace=${namespace || 'all'}`);
        setAnomalies(res.data.anomalies || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
    const int = setInterval(fetchInsights, 8000);
    return () => clearInterval(int);
  }, [namespace]);

  if (loading) {
    return (
      <div className="rounded-xl border animate-pulse h-full" 
           style={{ background: "#0d1117", borderColor: "#30363d" }}>
      </div>
    );
  }

  return (
    <div className="rounded-xl border shadow-2xl flex flex-col relative overflow-hidden h-full"
         style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", borderColor: "#30363d" }}>
      
      {/* Top accent glow */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#21262d]">
        <div className="p-1.5 rounded" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
          <Sparkles size={14} className="text-violet-400" />
        </div>
        <h3 className="text-[10px] font-mono font-bold text-gray-200 uppercase tracking-widest">
          AI Incident Insights
        </h3>
      </div>

      {/* Content area with internal scrollbar if needed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50 py-10">
            <ShieldAlert size={28} className="mb-2" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-center">No active incidents detected</span>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {anomalies.slice(0, 5).map((anomaly, idx) => {
              const isCrit = anomaly.severity === 'critical';
              const themeColor = isCrit ? "#ef4444" : "#f59e0b";
              
              return (
                <motion.div
                  key={idx}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-lg border p-3 relative overflow-hidden transition-all hover:bg-white/[0.02]"
                  style={{ 
                    background: "#0d1117", 
                    borderColor: `${themeColor}20`,
                    boxShadow: `inset 0 0 12px ${themeColor}05`
                  }}
                >
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={10} style={{ color: themeColor }} />
                      <span className="text-[10px] font-mono font-bold" style={{ color: themeColor }}>
                        {anomaly.pod_name}
                      </span>
                    </div>
                    <div className="text-[8px] font-mono px-1.5 py-0.5 rounded uppercase font-black tracking-tighter"
                         style={{ background: `${themeColor}20`, color: themeColor, border: `1px solid ${themeColor}30` }}>
                      {anomaly.anomaly_type.replace(/_/g, ' ')}
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-gray-400 font-mono mb-3 leading-relaxed">
                    {anomaly.description}
                  </p>
                  
                  <div className="relative p-2.5 rounded border border-violet-500/20 bg-violet-500/[0.03]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/30" />
                    <div className="text-[9px] font-mono text-violet-300 italic leading-relaxed">
                      <span className="font-bold not-italic mr-1 text-violet-400">ANALYSIS:</span>
                      {anomaly.llm_insight ? anomaly.llm_insight : "Synthesizing mitigation strategy..."}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Subtle grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
    </div>
  );
}
