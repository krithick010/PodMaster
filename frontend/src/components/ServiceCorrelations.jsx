import React, { useState, useEffect } from "react";
import axios from "axios";
import { Network, Sparkles, MessageSquare, Activity, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ServiceCorrelations() {
  const [correlations, setCorrelations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState(null);

  useEffect(() => {
    const fetchCorrelations = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/correlations");
        setCorrelations(res.data.top_correlations || []);
      } catch (e) {
        console.error("Error fetching correlations", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCorrelations();
    const int = setInterval(fetchCorrelations, 10000);
    return () => clearInterval(int);
  }, []);

  const handleExplain = async () => {
    setExplaining(true);
    try {
      const res = await axios.get("http://localhost:8000/api/summary/correlations");
      setExplanation(res.data.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setExplaining(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border animate-pulse h-full" 
           style={{ background: "#0d1117", borderColor: "#30363d" }}>
      </div>
    );
  }

  return (
    <div className="rounded-xl border shadow-2xl h-full flex flex-col relative overflow-hidden"
         style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", borderColor: "#30363d" }}>
      
      {/* Background glow */}
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center px-5 py-3 border-b border-[#21262d]">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/25">
            <Network size={14} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-[10px] font-mono font-bold text-gray-200 uppercase tracking-widest">
              Service Correlations
            </h3>
            <div className="text-[9px] font-mono text-gray-500 mt-0.5 uppercase tracking-tighter">Relationship Intelligence</div>
          </div>
        </div>
        <button 
          onClick={handleExplain}
          disabled={explaining}
          className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-mono font-bold uppercase rounded border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-all disabled:opacity-50 active:scale-95"
        >
          {explaining ? <Activity size={12} className="animate-spin" /> : <Sparkles size={12} />}
          AI Explain
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin relative z-10">
        <AnimatePresence>
          {explanation && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-violet-500/5 border border-violet-500/20 rounded-lg p-3 mb-2"
            >
              <div className="flex items-center gap-2 mb-2 text-violet-400 text-[10px] font-mono font-bold uppercase">
                <MessageSquare size={12} /> Root Cause Analysis
              </div>
              <ul className="space-y-1.5">
                {explanation.map((item, i) => (
                  <li key={i} className="text-[10px] text-gray-400 font-mono leading-relaxed flex gap-2">
                    <span className="text-violet-500 mt-1 shrink-0">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {correlations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-40 py-12">
            <Network size={32} className="mb-2" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-center">
              Awaiting temporal data...<br/>
              <span className="text-[8px] normal-case opacity-60">Collecting metrics for relationship analysis</span>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {correlations.map((corr, idx) => {
              const strength = Math.abs(corr.correlation);
              const isPositive = corr.correlation > 0;
              const barWidth = `${strength * 100}%`;
              const themeColor = isPositive ? "#10b981" : "#f59e0b";
              
              return (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="space-y-2 group"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-gray-300 truncate font-bold">{corr.pod1.split('/')[1]}</span>
                      <ChevronRight size={10} className="text-gray-600 shrink-0" />
                      <span className="text-gray-300 truncate font-bold">{corr.pod2.split('/')[1]}</span>
                    </div>
                    <span className="font-bold tabular-nums ml-4" style={{ color: themeColor }}>
                      {(corr.correlation * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden flex relative shadow-inner">
                    <div className="h-full transition-all duration-1000 ease-out rounded-full" 
                         style={{ 
                           width: barWidth, 
                           background: themeColor,
                           boxShadow: `0 0 10px ${themeColor}88`
                         }}></div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
    </div>
  );
}
