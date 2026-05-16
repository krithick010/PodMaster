import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  Cpu, MemoryStick, HardDrive, Network, Terminal, X, Clock, Skull, Zap, CheckCircle2
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

export function ChaosControl() {
  const [loading, setLoading] = useState(null);
  const [activeInjections, setActiveInjections] = useState([]);
  const [message, setMessage] = useState(null); // { text, ok }
  const timeoutsRef = useRef({});
  const isAnyActive = activeInjections.length > 0;

  const triggerChaos = async (chaos) => {
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
        // Notify Live Stream that this chaos has auto-recovered
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
      
      // Fire an aborted event and clear timeouts
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
      
      setActiveInjections([]);
      setMessage({ text: "[OK] Graceful termination signal sent to all agents.", ok: true });
    } catch (err) {
      setMessage({ text: `[FAIL] Abort failed: ${err.message}`, ok: false });
    }
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
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

        {/* ── Scenario Grid ───────────────────────── */}
        <div className="grid grid-cols-5 gap-3 px-5 pt-4 pb-3">
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
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: chaos.color, boxShadow: `0 0 6px ${chaos.color}` }} />
                  ) : (
                    <div className="text-[8px] font-mono px-1 py-0.5 rounded"
                      style={{ border: `1px solid ${chaos.border}`, color: chaos.color }}>
                      READY
                    </div>
                  )}
                </div>

                <div className="relative z-10">
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
                    <ActiveInjectionRow key={inj.uid} injection={inj} />
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

function ActiveInjectionRow({ injection }) {
  const [timeLeft, setTimeLeft] = useState(injection.duration);

  useEffect(() => {
    const iv = setInterval(() => {
      const elapsed = (Date.now() - injection.startTime) / 1000;
      setTimeLeft(Math.max(0, Math.ceil(injection.duration - elapsed)));
    }, 500);
    return () => clearInterval(iv);
  }, [injection]);

  const progress = (timeLeft / injection.duration) * 100;
  const Icon = injection.icon;

  return (
    <motion.div
      initial={{ x: -12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 12, opacity: 0 }}
      className="relative rounded overflow-hidden flex items-center gap-2 px-2 py-1.5"
      style={{ background: "#0d1117", border: "1px solid #1e293b" }}
    >
      {/* Progress fill */}
      <div
        className="absolute left-0 top-0 bottom-0 transition-all duration-1000"
        style={{ width: `${progress}%`, background: `${injection.color}18` }}
      />
      <Icon size={12} style={{ color: injection.color }} className="relative z-10 shrink-0" />
      <div className="flex-1 relative z-10 min-w-0">
        <span className="font-bold" style={{ color: injection.color }}>{injection.label}</span>
        <span className="mx-1" style={{ color: "#334155" }}>›</span>
        <span style={{ color: "#64748b" }}>{injection.namespace}/</span>
        <span style={{ color: "#93c5fd" }}>{injection.pod}</span>
      </div>
      <div className="relative z-10 flex items-center gap-1 px-1.5 py-0.5 rounded shrink-0"
        style={{ background: "#0a0f18", border: "1px solid #1e293b" }}>
        <Clock size={9} style={{ color: injection.color }} />
        <span className="text-[9px] font-bold" style={{ color: injection.color }}>T-{timeLeft}s</span>
      </div>
    </motion.div>
  );
}
