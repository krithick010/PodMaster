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
      icon: <CheckCircle2 size={16} className="text-accent-emerald" />,
      border: "border-l-accent-emerald",
      bg: "bg-accent-emerald/5",
      tag: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
      glow: "shadow-2xs",
    };
    if (severity === "aborted") return {
      icon: <X size={16} className="text-accent-amber" />,
      border: "border-l-accent-amber",
      bg: "bg-accent-amber/5",
      tag: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
      glow: "shadow-2xs",
    };

    switch (severity) {
      case "critical": return {
        icon: <ShieldAlert size={16} className="text-accent-red" />,
        border: "border-l-accent-red",
        bg: "bg-accent-red/5",
        tag: "bg-accent-red/10 text-accent-red border-accent-red/20",
        glow: "shadow-2xs"
      };
      case "warning": return {
        icon: <AlertTriangle size={16} className="text-accent-amber" />,
        border: "border-l-accent-amber",
        bg: "bg-accent-amber/5",
        tag: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
        glow: "shadow-2xs"
      };
      default: return {
        icon: <CheckCircle2 size={16} className="text-accent-emerald" />,
        border: "border-l-accent-emerald",
        bg: "bg-accent-emerald/5",
        tag: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
        glow: "shadow-2xs"
      };
    }
  };

  if (loading) {
    return <div className="bg-surface border border-subtle rounded-xl p-6 animate-pulse h-full shadow-sm"></div>;
  }

  return (
    <div className="bg-surface border border-subtle rounded-xl shadow-sm h-full flex flex-col relative overflow-hidden text-primary font-sans font-medium">
      
      {/* Glossy Header */}
      <div className="bg-elevated/80 backdrop-blur-md border-b border-subtle p-4 flex items-center justify-between z-10 font-sans">
        <div className="flex items-center gap-2.5">
          <Terminal size={18} className="text-accent-cyan" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider font-sans">
            Live Activity Stream
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-mono text-muted uppercase tracking-wider font-semibold">Real-time</span>
          <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse shadow-2xs"></div>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
        {activities.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-xs font-mono text-muted uppercase tracking-wider">
            <Activity size={28} className="opacity-40 animate-pulse" />
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
                  className={`border-l-4 ${styles.border} ${styles.bg} ${styles.glow} rounded-r-xl p-3.5 border-y border-r border-subtle relative group transition-all hover:bg-elevated/50 shadow-2xs`}
                >
                  <div className="flex items-start gap-3.5 font-sans">
                    <div className="mt-0.5 shrink-0 bg-surface p-2 rounded-lg border border-subtle shadow-2xs relative z-10">
                      {styles.icon}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-2 font-mono">
                        <span className="text-xs font-mono text-muted">
                          {new Date(activity.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${styles.tag} uppercase font-bold shadow-2xs`}>
                          {tagText}
                        </span>
                        <span className="text-xs font-mono font-bold text-primary truncate font-sans">
                          {activity.pod}
                        </span>
                      </div>

                      <div className={`text-xs leading-relaxed break-words font-sans ${isSpecial ? 'text-primary font-bold' : 'text-secondary'}`}>
                        <ChevronRight size={14} className="inline text-muted mr-1 -mt-0.5" />
                        {activity.message}
                      </div>

                      {activity.insight && (
                        <div className="mt-3 pl-3.5 border-l-2 border-accent-violet py-1 bg-surface/50 rounded-r-lg">
                          <div className="text-xs text-secondary leading-relaxed font-sans">
                            <span className="text-accent-violet font-bold font-mono mr-2 uppercase text-[10px] px-1.5 py-0.5 bg-accent-violet/10 rounded">AI_INSIGHT:</span>
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
           style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
    </div>
  );
}
