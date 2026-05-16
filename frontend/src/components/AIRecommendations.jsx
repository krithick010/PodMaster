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
    return <div className="rounded-xl border border-subtle bg-surface animate-pulse h-64 shadow-sm"></div>;
  }

  return (
    <div className="rounded-xl border border-subtle shadow-sm p-6 relative overflow-hidden bg-surface text-primary font-sans font-medium">
      
      {/* Background patterns */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="flex items-center justify-between mb-6 relative z-10 font-sans">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 shadow-2xs">
            <Terminal size={20} className="text-accent-cyan" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider font-sans">
              AI Action Recommendations
            </h3>
            <div className="text-[10px] font-mono text-muted mt-0.5">AUTONOMOUS OPTIMIZATION STRATEGY</div>
          </div>
        </div>
        <div className="bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider shadow-2xs">
          {recommendations.length} Detected Issues
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted relative z-10 font-sans font-medium">
          <CheckCircle2 size={44} className="text-accent-emerald/60 mb-3.5" />
          <p className="text-xs font-sans uppercase font-bold tracking-wider">Cluster is in optimal state</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10 font-sans font-medium">
          <AnimatePresence mode="popLayout">
            {recommendations.slice(0, 3).map((rec, idx) => {
              const isCrit = rec.priority === "critical";
              const themeClass = isCrit ? "accent-red" : rec.priority === "warning" ? "accent-amber" : "accent-cyan";
              const borderClass = isCrit ? "border-accent-red/30" : rec.priority === "warning" ? "border-accent-amber/30" : "border-accent-cyan/30";
              const bgBadge = isCrit ? "bg-accent-red text-white" : rec.priority === "warning" ? "bg-accent-amber text-white" : "bg-accent-cyan text-white";
              const bgIcon = isCrit ? "bg-accent-red/10 text-accent-red border-accent-red/20" : rec.priority === "warning" ? "bg-accent-amber/10 text-accent-amber border-accent-amber/20" : "bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20";

              return (
                <motion.div
                  key={rec.id || idx}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`rounded-xl border ${borderClass} bg-elevated p-5 relative overflow-hidden group transition-all hover:bg-surface shadow-2xs`}
                >
                  {/* Vertical accent */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full bg-${themeClass}`} />

                  {/* Priority Badge */}
                  <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-mono font-black uppercase tracking-wider rounded-bl-xl shadow-2xs ${bgBadge}`}>
                    {rec.priority}
                  </div>

                  <div className="flex items-start gap-4 pt-2 font-sans">
                    <div className={`p-3 rounded-lg shrink-0 border shadow-2xs ${bgIcon}`}>
                      {getIcon(rec.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-primary mb-1.5 leading-tight">{rec.action}</h4>
                      <p className="text-xs text-secondary mb-4 leading-relaxed line-clamp-2">
                        {rec.explanation}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-4 font-mono">
                        <div className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-subtle text-primary shadow-2xs font-semibold">
                          {rec.target_pod || 'Cluster'}
                        </div>
                        <div className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface border border-subtle text-muted shadow-2xs">
                          Est: {rec.estimated_time || '2m'}
                        </div>
                      </div>

                      {rec.kubectl_command && (
                        <div className="bg-surface rounded-lg border border-subtle p-2.5 flex items-center justify-between group/cmd transition-colors shadow-inner font-mono">
                          <code className="text-[11px] text-accent-emerald font-mono truncate mr-2 font-bold">
                            $ {rec.kubectl_command}
                          </code>
                          <button 
                            onClick={() => copyToClipboard(rec.id || idx, rec.kubectl_command)}
                            className="p-1.5 hover:bg-elevated rounded-md transition-colors text-muted hover:text-primary border border-transparent hover:border-subtle shadow-2xs"
                          >
                            {copiedId === (rec.id || idx) ? <CheckCircle2 size={14} className="text-accent-emerald"/> : <Copy size={14} />}
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
