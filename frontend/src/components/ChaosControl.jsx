import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Cpu, MemoryStick, HardDrive, Network, Terminal, X, Clock, Skull, Zap, CheckCircle2, Info, ShieldAlert, Sparkles, Trash2
} from "lucide-react";

const CHAOS_TYPES = [
  {
    id: "cpu",
    label: "CPU Stress",
    icon: Cpu,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    pod: "student-portal",
    namespace: "university-frontend",
    endpoint: "cpu-spike",
    description: "Force 95%+ core utilization",
    command: "stress-ng --cpu 8 --timeout 90s",
    duration: 90,
  },
  {
    id: "memory",
    label: "Memory Leak",
    icon: MemoryStick,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.35)",
    pod: "result-service-0",
    namespace: "university-backend",
    endpoint: "memory-leak",
    description: "Simulate OOM pressure",
    command: "malloc_test --leak-rate 10MB/s",
    duration: 90,
  },
  {
    id: "storage",
    label: "I/O Pressure",
    icon: HardDrive,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.35)",
    pod: "attendance-service",
    namespace: "university-backend",
    endpoint: "storage-pressure",
    description: "Exhaust PVC volume capacity",
    command: "dd if=/dev/zero of=/data/fill.img",
    duration: 90,
  },
  {
    id: "network",
    label: "Net Throttle",
    icon: Network,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.35)",
    pod: "result-service-0",
    namespace: "university-backend",
    endpoint: "network-spike",
    description: "Simulate high packet loss",
    command: "tc qdisc add dev eth0 root netem",
    duration: 90,
  },
  {
    id: "log",
    label: "Log Flood",
    icon: Terminal,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    border: "rgba(6,182,212,0.35)",
    pod: "notification-service",
    namespace: "university-frontend",
    endpoint: "log-flood",
    description: "Generate excessive error logs",
    command: "logger -s -p err 'CRITICAL'",
    duration: 90,
  },
];

const CHAOS_STORAGE_KEY = "podmaster.chaos.activeInjections";

const loadPersistedInjections = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CHAOS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    return parsed.filter((injection) => {
      const remaining = injection.duration * 1000 - (now - injection.startTime);
      return Number.isFinite(remaining) && remaining > 0;
    });
  } catch (error) {
    return [];
  }
};

const savePersistedInjections = (injections) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CHAOS_STORAGE_KEY, JSON.stringify(injections));
  } catch (error) {
    // Ignore storage quota or privacy-mode failures.
  }
};

export function ChaosControl() {
  const [loading, setLoading] = useState(null);
  const [activeInjections, setActiveInjections] = useState(() => loadPersistedInjections());
  const [pendingChaos, setPendingChaos] = useState({}); // { [chaos.id]: secondsLeft }
  const [message, setMessage] = useState(null); // { text, ok }
  const timeoutsRef = useRef({});
  const stagingRefs = useRef({});
  const isAnyActive = activeInjections.length > 0;

  useEffect(() => {
    savePersistedInjections(activeInjections);
  }, [activeInjections]);

  useEffect(() => {
    const restored = loadPersistedInjections();
    if (restored.length === 0) return;

    setActiveInjections(restored);

    restored.forEach((injection) => {
      if (timeoutsRef.current[injection.uid]) return;

      const elapsed = Date.now() - injection.startTime;
      const remaining = Math.max(0, (injection.duration * 1000) - elapsed);
      if (remaining <= 0) return;

      timeoutsRef.current[injection.uid] = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("chaosResolved", {
          detail: {
            id: injection.uid,
            label: injection.label,
            pod: injection.pod,
            namespace: injection.namespace,
            color: injection.color,
            icon: injection.id,
          }
        }));
        setActiveInjections((prev) => prev.filter((item) => item.uid !== injection.uid));
        delete timeoutsRef.current[injection.uid];
      }, remaining);
    });
  }, []);

  const triggerChaos = (chaos) => {
    if (pendingChaos[chaos.id] !== undefined) return;
    if (activeInjections.some(i => i.id === chaos.id)) return;

    setPendingChaos(prev => ({ ...prev, [chaos.id]: 5 }));
    setMessage({ text: `[STAGING] ${chaos.label} armed. Revoke window active for 5s...`, ok: true });

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const left = 5 - elapsed;
      if (left <= 0) {
        clearInterval(interval);
      } else {
        setPendingChaos(prev => prev[chaos.id] ? { ...prev, [chaos.id]: left } : prev);
      }
    }, 1000);

    const timeoutId = setTimeout(() => {
      clearInterval(interval);
      setPendingChaos(prev => {
        const copy = { ...prev };
        delete copy[chaos.id];
        return copy;
      });
      executeChaos(chaos);
    }, 5000);

    stagingRefs.current[chaos.id] = { interval, timeoutId };
  };

  const revokeChaos = (e, chaosId) => {
    e.stopPropagation();
    if (stagingRefs.current[chaosId]) {
      clearInterval(stagingRefs.current[chaosId].interval);
      clearTimeout(stagingRefs.current[chaosId].timeoutId);
      delete stagingRefs.current[chaosId];
    }
    setPendingChaos(prev => {
      const copy = { ...prev };
      delete copy[chaosId];
      return copy;
    });
    setMessage({ text: `[REVOKED] ${chaosId.toUpperCase()} injection safely aborted by operator.`, ok: true });
  };

  const abortInjection = async (e, uid, label) => {
    e.stopPropagation();
    try {
      if (timeoutsRef.current[uid]) {
        clearTimeout(timeoutsRef.current[uid]);
        delete timeoutsRef.current[uid];
      }
      setActiveInjections(prev => prev.filter(i => i.uid !== uid));
      setMessage({ text: `[REVOKED] ${label.toUpperCase()} injection aborted by operator.`, ok: true });
      await axios.post("http://localhost:8000/api/chaos/disable");
    } catch (err) {
      console.error("Error aborting injection", err);
    }
  };

  const executeChaos = async (chaos) => {
    setLoading(chaos.id);
    setMessage(null);
    try {
      await axios.post(
        `http://localhost:8000/api/simulate/${chaos.endpoint}?pod_name=${chaos.pod}&namespace=${chaos.namespace}`
      );
      const uid = Date.now();
      const injection = {
        uid,
        ...chaos,
        startTime: Date.now(),
      };
      setActiveInjections((prev) => [...prev, injection]);
      setMessage({ text: `[OK] Payload delivered → ${chaos.namespace}/${chaos.pod}`, ok: true });
      
      const timeoutId = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("chaosResolved", {
          detail: {
            id: uid,
            label: chaos.label,
            pod: chaos.pod,
            namespace: chaos.namespace,
            color: chaos.color,
            icon: chaos.id,
          }
        }));
        setActiveInjections((prev) => prev.filter((i) => i.uid !== uid));
        delete timeoutsRef.current[uid];
      }, chaos.duration * 1000);

      timeoutsRef.current[uid] = timeoutId;
    } catch (err) {
      setMessage({ text: `[FAIL] ${err.response?.data?.detail || err.message}`, ok: false });
    } finally {
      setLoading(null);
    }
  };

  const abortAll = async () => {
    try {
      await axios.post("http://localhost:8000/api/chaos/disable");
      
      activeInjections.forEach((inj) => {
        if (timeoutsRef.current[inj.uid]) {
            clearTimeout(timeoutsRef.current[inj.uid]);
            delete timeoutsRef.current[inj.uid];
        }
        
        window.dispatchEvent(new CustomEvent("chaosAborted", {
          detail: {
            id: inj.uid,
            label: inj.label,
            pod: inj.pod,
            namespace: inj.namespace,
            color: inj.color,
          }
        }));
      });
      
      Object.keys(stagingRefs.current).forEach(key => {
        clearInterval(stagingRefs.current[key].interval);
        clearTimeout(stagingRefs.current[key].timeoutId);
      });
      stagingRefs.current = {};
      setPendingChaos({});
      
      setActiveInjections([]);
      savePersistedInjections([]);
      setMessage({ text: "[OK] Graceful termination signal sent to all agents and pending stages.", ok: true });
    } catch (err) {
      setMessage({ text: `[FAIL] Abort failed: ${err.message}`, ok: false });
    }
  };

  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      Object.values(stagingRefs.current).forEach(ref => {
        clearInterval(ref.interval);
        clearTimeout(ref.timeoutId);
      });
    };
  }, []);

  return (
    <div
      className="rounded-xl border overflow-hidden shadow-2xl h-full flex flex-col relative"
      style={{ background: "#0c0f14", borderColor: "#1e293b" }}
    >
      {/* Dot-grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "radial-gradient(#1e293b 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

      {/* RED alert pulse border when active */}
      {isAnyActive && (
        <div className="absolute inset-0 border-2 border-red-500/60 rounded-xl pointer-events-none animate-pulse z-10" />
      )}

      <div className="relative z-20 flex flex-col h-full">
        {/* ── Header ─────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid #1e293b" }}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>
              <Skull size={16} className="text-red-500" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-gray-200">
                Chaos Control Center
              </div>
              <div className="text-[9px] font-mono mt-0.5" style={{ color: "#475569" }}>
                DESTRUCTIVE ACTIONS AUTHORIZED · AUTO-RECOVER 90s
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active badge */}
            {isAnyActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono font-bold uppercase"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)", color: "#ef4444" }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {activeInjections.length} ACTIVE
              </motion.div>
            )}
            {/* Abort all */}
            {isAnyActive && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={abortAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest transition-colors"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.5)", color: "#ef4444" }}
              >
                <X size={12} /> Abort All
              </motion.button>
            )}
          </div>
        </div>

        {/* ── SRE Chaos Engineering Guide & Research Principles ───────────────────────── */}
        <div className="mx-5 mt-4 p-4 rounded-xl border font-sans" style={{ background: "rgba(15,23,42,0.4)", borderColor: "#334155" }}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-accent-cyan" />
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider font-display">
              Chaos Sandbox & Resilience Verification Guide
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-3 font-sans">
            This sandbox environment allows Site Reliability Engineers to inject controlled, destructive faults to empirically verify cluster self-healing mechanisms and autonomous AI agent response times under severe operational stress.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-sans">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-accent-red font-bold text-xs">
                <ShieldAlert size={14} /> 1. Hypothesis Testing
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Inject compute spikes, memory leaks, or network throttling to validate auto-scaling thresholds and circuit breaker triggers.
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-accent-cyan font-bold text-xs">
                <Info size={14} /> 2. AI Daemon Mitigation
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                PodMaster's 6 AI Daemons detect cgroup exhaustion in &lt;10s and dispatch corrective kubectl remedies autonomously.
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-accent-emerald font-bold text-xs">
                <CheckCircle2 size={14} /> 3. Strict Blast Radius
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                Faults are strictly isolated to target pods. Auto-recovery triggers after 90s, restoring nominal cgroup state instantly.
              </div>
            </div>
          </div>
        </div>

        {/* ── Scenario Grid ───────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 px-5 pt-4 pb-3">
          {CHAOS_TYPES.map((chaos) => {
            const Icon = chaos.icon;
            const isLoading = loading === chaos.id;
            const isActive = activeInjections.some((i) => i.id === chaos.id);
            return (
              <motion.button
                key={chaos.id}
                onClick={() => triggerChaos(chaos)}
                disabled={!!loading}
                whileHover={!loading ? { scale: 1.04, y: -2 } : {}}
                whileTap={!loading ? { scale: 0.97 } : {}}
                className="flex flex-col items-start gap-2 p-3 rounded-lg text-left transition-all duration-200 relative overflow-hidden"
                style={{
                  background: isActive ? chaos.bg : "rgba(15,20,30,0.8)",
                  border: `1px solid ${isActive ? chaos.color : "#1e293b"}`,
                  boxShadow: isActive ? `0 0 14px ${chaos.color}44` : "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading && !isLoading ? 0.5 : 1,
                }}
              >
                {/* Active pulse overlay */}
                {isActive && (
                  <div className="absolute inset-0 animate-pulse" style={{ background: `${chaos.color}08` }} />
                )}

                <div className="relative z-10 flex justify-between items-start w-full">
                  <div className="p-1.5 rounded-md" style={{ background: chaos.bg, border: `1px solid ${chaos.border}` }}>
                    <Icon size={14} style={{ color: chaos.color }} />
                  </div>
                  {isLoading ? (
                    <div className="w-3 h-3 border border-gray-500 border-t-white rounded-full animate-spin" />
                  ) : pendingChaos[chaos.id] !== undefined ? (
                    <button
                      onClick={(e) => revokeChaos(e, chaos.id)}
                      title="Revoke / Abort Injection"
                      className="z-20 px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-[10px] font-mono font-bold text-white flex items-center gap-1.5 animate-bounce shadow-md"
                    >
                      <Trash2 size={12} /> REVOKE ({pendingChaos[chaos.id]}s)
                    </button>
                  ) : isActive ? (
                    <button
                      onClick={(e) => {
                        const activeInj = activeInjections.find(i => i.id === chaos.id);
                        if (activeInj) abortInjection(e, activeInj.uid, activeInj.label);
                      }}
                      title="Undo Active Chaos"
                      className="z-20 px-2 py-1 bg-red-500/20 hover:bg-red-500 border border-red-500/50 hover:border-red-500 rounded text-[10px] font-mono font-bold text-red-400 hover:text-white flex items-center gap-1 transition-all shadow-md"
                    >
                      <Trash2 size={12} /> UNDO
                    </button>
                  ) : (
                    <div className="text-[8px] font-mono px-1 py-0.5 rounded font-bold"
                      style={{ border: `1px solid ${chaos.border}`, color: chaos.color }}>
                      READY
                    </div>
                  )}
                </div>

                <div className="relative z-10 mt-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wide text-gray-200">
                    {chaos.label}
                  </div>
                  <div className="text-[9px] font-mono mt-0.5 leading-tight" style={{ color: "#475569" }}>
                    {chaos.description}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* ── Console ─────────────────────────────── */}
        <div className="flex-1 mx-5 mb-4 rounded-lg flex flex-col overflow-hidden"
          style={{ background: "rgba(0,0,0,0.7)", border: "1px solid #1e293b" }}>

          {/* Console title */}
          <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid #1e293b" }}>
            <Terminal size={11} style={{ color: "#475569" }} />
            <span className="text-[9px] font-mono uppercase tracking-widest" style={{ color: "#475569" }}>
              System Console
            </span>
          </div>

          {/* Console body */}
          <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto text-xs font-mono">
            <div style={{ color: "#475569" }}>
              <span style={{ color: "#10b981" }}>user@podmaster:~$</span> system_status
            </div>

            {/* Status message */}
            {message ? (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ color: message.ok ? "#10b981" : "#ef4444" }}
              >
                {message.text}
              </motion.div>
            ) : (
              <div style={{ color: "#334155" }}>System idle. Ready for payload injection.</div>
            )}

            {/* Active injection rows */}
            <AnimatePresence>
              {activeInjections.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 space-y-1.5 pt-2"
                  style={{ borderTop: "1px solid #1e293b" }}
                >
                  <div className="text-[9px] uppercase tracking-widest" style={{ color: "#475569" }}>
                    Active Subroutines ({activeInjections.length})
                  </div>
                  {activeInjections.map((inj) => (
                    <ActiveInjectionRow key={inj.uid} injection={inj} onAbort={abortInjection} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveInjectionRow({ injection, onAbort }) {
  const [timeLeft, setTimeLeft] = useState(injection.duration);

  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = (Date.now() - injection.startTime) / 1000;
      setTimeLeft(Math.max(0, Math.ceil(injection.duration - elapsed)));
    }, 500);
    return () => clearInterval(iv);
  }, [injection]);

  const progress = (timeLeft / injection.duration) * 100;
  const staticConfig = CHAOS_TYPES.find(c => c.id === injection.id);
  const Icon = staticConfig ? staticConfig.icon : injection.icon;

  return (
    <motion.div
      initial={{ x: -12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 12, opacity: 0 }}
      className="relative rounded overflow-hidden flex items-center gap-2 px-2.5 py-2 text-xs font-mono"
      style={{ background: "#0d1117", border: "1px solid #1e293b" }}
    >
      {/* Progress fill */}
      <div
        className="absolute left-0 top-0 bottom-0 transition-all duration-1000 pointer-events-none"
        style={{ width: `${progress}%`, background: `${injection.color}18` }}
      />
      <Icon size={14} style={{ color: injection.color }} className="relative z-10 shrink-0" />
      <div className="flex-1 relative z-10 min-w-0 flex items-center gap-1.5">
        <span className="font-bold" style={{ color: injection.color }}>{injection.label}</span>
        <span style={{ color: "#334155" }}>›</span>
        <span style={{ color: "#64748b" }}>{injection.namespace}/</span>
        <span style={{ color: "#93c5fd" }}>{injection.pod}</span>
      </div>
      <div className="relative z-10 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded border"
          style={{ background: "#0a0f18", borderColor: "#1e293b" }}>
          <Clock size={10} style={{ color: injection.color }} />
          <span className="text-[10px] font-bold font-mono" style={{ color: injection.color }}>T-{timeLeft}s</span>
        </div>
        <button
          onClick={(e) => onAbort(e, injection.uid, injection.label)}
          title="Revoke / Undo Active Injection"
          className="p-1 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 hover:border-red-500 transition-all shadow-md"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}
