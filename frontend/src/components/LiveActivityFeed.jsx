import React, { useState, useEffect } from "react";
import axios from "axios";
import { Activity, AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight, Terminal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function LiveActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/activity");
        setActivities(res.data.activities || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivity();
    const int = setInterval(fetchActivity, 5000);

    // Listen for chaos auto-recovery events
    const onChaosResolved = (e) => {
      const { label, pod, namespace } = e.detail;
      setActivities((prev) => [{
        id: `resolved-${Date.now()}`,
        type: "chaos_resolved",
        severity: "resolved",
        pod,
        namespace,
        message: `[CHAOS ENDED] ${label} on ${pod} has auto-recovered`,
        timestamp: new Date().toISOString(),
        insight: null,
      }, ...prev.slice(0, 24)]);
    };

    // Listen for chaos manually aborted
    const onChaosAborted = (e) => {
      const { label, pod, namespace } = e.detail;
      setActivities((prev) => [{
        id: `aborted-${Date.now()}-${pod}`,
        type: "chaos_aborted",
        severity: "aborted",
        pod,
        namespace,
        message: `[ABORTED] ${label} on ${pod} was manually terminated`,
        timestamp: new Date().toISOString(),
        insight: null,
      }, ...prev.slice(0, 24)]);
    };

    window.addEventListener("chaosResolved", onChaosResolved);
    window.addEventListener("chaosAborted", onChaosAborted);
    return () => {
      clearInterval(int);
      window.removeEventListener("chaosResolved", onChaosResolved);
      window.removeEventListener("chaosAborted", onChaosAborted);
    };
  }, []);

  const getSeverityStyles = (severity) => {
    if (severity === "resolved") return {
      icon: <CheckCircle2 size={14} className="text-[#10b981]" />,
      border: "border-l-[#10b981]",
      bg: "bg-gradient-to-r from-[#10b981]/10 to-transparent",
      tag: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30",
      glow: "shadow-[inset_2px_0_10px_rgba(16,185,129,0.2)]",
    };
    if (severity === "aborted") return {
      icon: <X size={14} className="text-[#f59e0b]" />,
      border: "border-l-[#f59e0b]",
      bg: "bg-gradient-to-r from-[#f59e0b]/10 to-transparent",
      tag: "bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30",
      glow: "shadow-[inset_2px_0_10px_rgba(245,158,11,0.2)]",
    };

    switch (severity) {
      case "critical": return {
        icon: <ShieldAlert size={14} className="text-[#ef4444]" />,
        border: "border-l-[#ef4444]",
        bg: "bg-gradient-to-r from-[#ef4444]/10 to-transparent",
        tag: "bg-[#ef4444]/20 text-[#ef4444] border-[#ef4444]/30",
        glow: "shadow-[inset_2px_0_10px_rgba(239,68,68,0.2)]"
      };
      case "warning": return {
        icon: <AlertTriangle size={14} className="text-[#f59e0b]" />,
        border: "border-l-[#f59e0b]",
        bg: "bg-gradient-to-r from-[#f59e0b]/10 to-transparent",
        tag: "bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30",
        glow: "shadow-[inset_2px_0_10px_rgba(245,158,11,0.2)]"
      };
      default: return {
        icon: <CheckCircle2 size={14} className="text-[#10b981]" />,
        border: "border-l-[#10b981]",
        bg: "bg-gradient-to-r from-[#10b981]/5 to-transparent",
        tag: "bg-[#10b981]/20 text-[#10b981] border-[#10b981]/30",
        glow: "shadow-[inset_2px_0_10px_rgba(16,185,129,0.1)]"
      };
    }
  };

  if (loading) {
    return <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 animate-pulse h-full shadow-2xl"></div>;
  }

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl h-full flex flex-col relative overflow-hidden">
      
      {/* Glossy Header */}
      <div className="bg-[#161b22]/80 backdrop-blur-md border-b border-[#30363d] p-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <Terminal size={14} className="text-cyan-400" />
          <h3 className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-[0.2em]">
            Live Activity Stream
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Real-time</span>
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 pulse shadow-[0_0_8px_#06b6d4]"></div>
        </div>
      </div>

      {/* Code-editor style Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {activities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            <Activity size={24} className="opacity-20 animate-pulse" />
            Awaiting telemetry...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {activities.map((activity, idx) => {
              const styles = getSeverityStyles(activity.severity);

              // ── Special: Chaos Resolved/Aborted Card Override ──────────────────────────
              const isSpecial = activity.type === "chaos_resolved" || activity.type === "chaos_aborted";
              const tagText = activity.type === "chaos_resolved" ? "✓ RECOVERED" : activity.type === "chaos_aborted" ? "✕ ABORTED" : activity.severity;
              
              return (
                <motion.div
                  key={activity.id || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={`border-l-[2px] ${styles.border} ${styles.bg} ${styles.glow} rounded-r-lg p-3 relative group transition-all hover:bg-white/[0.03]`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 bg-[#0d1117] p-1.5 rounded-full border border-[#30363d] shadow-sm relative z-10">
                      {styles.icon}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-1.5">
                        <span className="text-[9px] font-mono text-gray-500">
                          {new Date(activity.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                        </span>
                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border ${styles.tag} uppercase tracking-tighter font-black`}>
                          {tagText}
                        </span>
                        <span className="text-[10px] font-mono text-gray-300 font-bold truncate">
                          {activity.pod}
                        </span>
                      </div>

                      <div className={`text-[11px] font-mono leading-relaxed break-words ${isSpecial ? 'text-gray-100 font-bold' : 'text-gray-200'}`}>
                        <ChevronRight size={10} className="inline text-gray-600 mr-1" />
                        {activity.message}
                      </div>

                      {activity.insight && (
                        <div className="mt-2 pl-3 border-l border-[#30363d] py-1">
                          <div className="text-[10px] font-mono text-gray-500 italic leading-relaxed">
                            <span className="text-violet-400 not-italic mr-2">AI_INSIGHT:</span>
                            {activity.insight}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
    </div>
  );
}
