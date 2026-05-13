import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Zap, X, Clock, AlertTriangle, Terminal, Cpu, MemoryStick, HardDrive, Network, Skull } from "lucide-react";

export function QuickChaos() {
  const [loading, setLoading] = useState(null);
  const [activeInjections, setActiveInjections] = useState([]);
  const [message, setMessage] = useState("");

  const chaosTypes = [
    {
      id: "cpu",
      label: "CPU Stress",
      icon: Cpu,
      colorClass: "text-red-500",
      bgClass: "bg-red-500/10",
      borderClass: "border-red-500/30",
      activeBorderClass: "border-red-500",
      pod: "student-portal",
      namespace: "university-frontend",
      description: "Force 95%+ core utilization",
      command: "stress-ng --cpu 8 --timeout 90s"
    },
    {
      id: "memory",
      label: "Memory Leak",
      icon: MemoryStick,
      colorClass: "text-purple-500",
      bgClass: "bg-purple-500/10",
      borderClass: "border-purple-500/30",
      activeBorderClass: "border-purple-500",
      pod: "notification-service",
      namespace: "university-frontend",
      description: "Allocate and hold memory",
      command: "malloc_test --leak-rate 10MB/s"
    },
    {
      id: "storage",
      label: "I/O Pressure",
      icon: HardDrive,
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/10",
      borderClass: "border-amber-500/30",
      activeBorderClass: "border-amber-500",
      pod: "attendance-service",
      namespace: "university-backend",
      description: "Exhaust PVC volume capacity",
      command: "dd if=/dev/zero of=/data/fill.img"
    },
    {
      id: "log",
      label: "Log Flood",
      icon: Terminal,
      colorClass: "text-cyan-500",
      bgClass: "bg-cyan-500/10",
      borderClass: "border-cyan-500/30",
      activeBorderClass: "border-cyan-500",
      pod: "notification-service",
      namespace: "university-frontend",
      description: "Generate excessive err logs",
      command: "logger -s -p err 'CRITICAL'"
    },
    {
      id: "network",
      label: "Net Throttling",
      icon: Network,
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10",
      borderClass: "border-emerald-500/30",
      activeBorderClass: "border-emerald-500",
      pod: "result-service",
      namespace: "university-backend",
      description: "Simulate high packet loss",
      command: "tc qdisc add dev eth0 root netem"
    }
  ];

  const triggerChaos = async (chaos) => {
    setLoading(chaos.id);
    setMessage("");

    try {
      let endpoint = "";
      if (chaos.id === "cpu") endpoint = "cpu-spike";
      else if (chaos.id === "memory") endpoint = "memory-leak";
      else if (chaos.id === "storage") endpoint = "storage-pressure";
      else if (chaos.id === "log") endpoint = "log-flood";
      else if (chaos.id === "network") endpoint = "network-spike";

      await axios.post(
        `http://localhost:8000/api/simulate/${endpoint}?pod_name=${chaos.pod}&namespace=${chaos.namespace}`
      );
      
      const injection = {
        id: Date.now(),
        type: chaos.label,
        icon: chaos.icon,
        colorClass: chaos.colorClass,
        bgClass: chaos.bgClass,
        pod: chaos.pod,
        namespace: chaos.namespace,
        command: chaos.command,
        startTime: Date.now(),
        duration: 90000 
      };
      
      setActiveInjections(prev => [...prev, injection]);
      setMessage(`[SUCCESS] Payload delivered to ${chaos.pod}`);
      
      setTimeout(() => {
        setActiveInjections(prev => prev.filter(i => i.id !== injection.id));
      }, 90000);
      
    } catch (err) {
      setMessage(`[FAILED] Execution aborted: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const clearAll = async () => {
    try {
      await axios.post("http://localhost:8000/api/chaos/disable");
      setActiveInjections([]);
      setMessage("[SUCCESS] Graceful termination signal sent to all agents.");
    } catch (err) {
      setMessage(`[FAILED] Termination failed: ${err.message}`);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-[#0c0f14] border border-[#1e293b] rounded-xl p-5 shadow-2xl relative overflow-hidden"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iIzFlMjkzYiI+PC9jaXJjbGU+Cjwvc3ZnPg==')] opacity-50 z-0 pointer-events-none"></div>

      <div className="relative z-10 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-1.5 rounded border border-red-500/30">
              <Skull size={18} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-gray-200 tracking-wider">
                CHAOS CONTROL CENTER
              </h3>
              <p className="text-[10px] font-mono text-gray-500 tracking-widest">
                TARGET: CLUSTER_ROOT // DESTRUCTIVE ACTIONS AUTHORIZED
              </p>
            </div>
          </div>
          {activeInjections.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-900/30 border border-red-500 text-red-400 text-[10px] font-mono hover:bg-red-900/50 transition-colors uppercase tracking-widest"
            >
              <X size={12} />
              Abort All Operations
            </motion.button>
          )}
        </div>

        {/* Chaos Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {chaosTypes.map((chaos) => (
            <motion.button
              key={chaos.id}
              onClick={() => triggerChaos(chaos)}
              disabled={loading === chaos.id}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative flex flex-col items-start gap-3 p-4 rounded-lg border bg-[#111827]/80 backdrop-blur-md transition-all duration-300 text-left ${
                loading === chaos.id
                  ? "opacity-50 cursor-wait border-gray-700"
                  : `cursor-pointer hover:shadow-lg ${chaos.borderClass} hover:${chaos.activeBorderClass}`
              }`}
            >
              <div className="flex justify-between items-start w-full">
                <div className={`p-2 rounded-md ${chaos.bgClass}`}>
                  <chaos.icon size={18} className={chaos.colorClass} />
                </div>
                {loading === chaos.id ? (
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                ) : (
                  <div className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${chaos.borderClass} ${chaos.colorClass}`}>
                    READY
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-xs font-bold font-mono text-gray-200 uppercase tracking-wide">
                  {chaos.label}
                </div>
                <div className="text-[10px] font-mono text-gray-500 mt-1 line-clamp-1">
                  {chaos.description}
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Console / Active Injections */}
        <div className="bg-black/60 border border-[#1e293b] rounded-lg p-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-gray-500 mb-2 pb-2 border-b border-[#1e293b] text-[10px] uppercase tracking-widest">
            <Terminal size={12} /> System Console
          </div>
          
          <div className="space-y-1">
            <div className="text-gray-400">
              <span className="text-emerald-500">user@kubevision:~$</span> system_status
            </div>
            {message ? (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`${
                  message.includes("SUCCESS") ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {message}
              </motion.div>
            ) : (
              <div className="text-gray-500">System idling. Ready for payload injection.</div>
            )}
          </div>

          <AnimatePresence>
            {activeInjections.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 pt-3 border-t border-[#1e293b] space-y-2"
              >
                <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-2">
                  Active Subroutines ({activeInjections.length})
                </div>
                {activeInjections.map((injection) => (
                  <ActiveInjectionCard key={injection.id} injection={injection} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function ActiveInjectionCard({ injection }) {
  const [timeLeft, setTimeLeft] = useState(90);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - injection.startTime;
      const remaining = Math.max(0, Math.ceil((injection.duration - elapsed) / 1000));
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [injection]);

  const progress = (timeLeft / 90) * 100;
  const Icon = injection.icon;

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      className={`relative flex items-center gap-3 px-3 py-2 rounded border border-[#1e293b] overflow-hidden bg-black`}
    >
      <div
        className={`absolute inset-0 opacity-20 transition-all duration-1000 ${injection.bgClass.replace('/10', '')}`}
        style={{ width: `${progress}%` }}
      />
      <div className={`relative z-10 ${injection.colorClass}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-gray-300 font-bold">{injection.type}</span>
          <span className="text-gray-500 text-[10px] px-1 bg-gray-900 rounded border border-gray-800">
            PID:{Math.floor(Math.random() * 9000) + 1000}
          </span>
        </div>
        <div className="text-gray-500 text-[10px] mt-0.5 truncate">
          <span className="text-purple-400">{injection.namespace}</span>/
          <span className="text-blue-400">{injection.pod}</span> 
          <span className="text-gray-600 mx-1">➜</span> 
          <span className="text-gray-400">{injection.command}</span>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-1.5 px-2 py-1 bg-gray-900 rounded border border-[#1e293b]">
        <Clock size={10} className={injection.colorClass} />
        <span className={`text-[10px] font-bold ${injection.colorClass}`}>
          T-{timeLeft}s
        </span>
      </div>
    </motion.div>
  );
}
