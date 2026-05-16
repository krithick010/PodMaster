import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ShieldAlert, Cpu, HeartPulse, CheckCircle2, Copy, Zap } from "lucide-react";

export function AIRecommendations() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/recommendations");
        setRecommendations(res.data.recommendations || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecs();
    const int = setInterval(fetchRecs, 10000);
    return () => clearInterval(int);
  }, []);

  const copyToClipboard = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getIcon = (type) => {
    if (type.toLowerCase().includes("scale") || type.toLowerCase().includes("cpu")) return <Cpu size={16} />;
    if (type.toLowerCase().includes("restart") || type.toLowerCase().includes("health")) return <HeartPulse size={16} />;
    return <Zap size={16} />;
  };

  if (loading) {
    return <div className="rounded-xl border animate-pulse h-64" style={{ background: "#0d1117", borderColor: "#30363d" }}></div>;
  }

  return (
    <div className="rounded-xl border shadow-2xl p-6 relative overflow-hidden"
         style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", borderColor: "#30363d" }}>
      
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(90deg, #fff 1px, transparent 1px), linear-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/25">
            <Terminal size={18} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-bold text-gray-200 uppercase tracking-widest">
              AI Action Recommendations
            </h3>
            <div className="text-[9px] font-mono text-gray-500 mt-0.5">AUTONOMOUS OPTIMIZATION STRATEGY</div>
          </div>
        </div>
        <div className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-tighter">
          {recommendations.length} Detected Issues
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 relative z-10">
          <CheckCircle2 size={40} className="text-emerald-500/40 mb-3" />
          <p className="text-[11px] font-mono uppercase tracking-[0.2em]">Cluster is in optimal state</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 relative z-10">
          <AnimatePresence mode="popLayout">
            {recommendations.slice(0, 3).map((rec, idx) => {
              const isCrit = rec.priority === "critical";
              const themeColor = isCrit ? "#ef4444" : rec.priority === "warning" ? "#f59e0b" : "#06b6d4";
              
              return (
                <motion.div
                  key={rec.id || idx}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-lg border p-4 relative overflow-hidden group transition-all hover:bg-white/[0.02]"
                  style={{ 
                    background: "#0d1117", 
                    borderColor: `${themeColor}20`,
                    boxShadow: `inset 0 0 20px ${themeColor}05`
                  }}
                >
                  {/* Vertical accent */}
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ background: themeColor, opacity: 0.3 }} />

                  {/* Priority Badge */}
                  <div className="absolute top-0 right-0 px-2.5 py-1 text-[9px] font-mono font-black uppercase tracking-widest rounded-bl-lg"
                       style={{ background: themeColor, color: "#0d1117" }}>
                    {rec.priority}
                  </div>

                  <div className="flex items-start gap-4 pt-2">
                    <div className="p-2.5 rounded-lg shrink-0" 
                         style={{ background: `${themeColor}15`, border: `1px solid ${themeColor}25`, color: themeColor }}>
                      {getIcon(rec.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-bold text-gray-100 mb-1 leading-tight">{rec.action}</h4>
                      <p className="text-[11px] text-gray-400 mb-4 leading-relaxed line-clamp-2">
                        {rec.explanation}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
                          {rec.target_pod || 'Cluster'}
                        </div>
                        <div className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400">
                          Est: {rec.estimated_time || '2m'}
                        </div>
                      </div>

                      {rec.kubectl_command && (
                        <div className="bg-[#05070a] rounded border border-white/5 p-2 flex items-center justify-between group/cmd transition-colors hover:border-cyan-500/30">
                          <code className="text-[10px] text-emerald-400 font-mono truncate mr-2">
                            $ {rec.kubectl_command}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(rec.id || idx, rec.kubectl_command)}
                            className="p-1 hover:bg-white/10 rounded transition-colors text-gray-500 hover:text-white"
                          >
                            {copiedId === (rec.id || idx) ? <CheckCircle2 size={12} className="text-emerald-400"/> : <Copy size={12} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
