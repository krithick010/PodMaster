import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { Zap, X, Clock, Flame } from "lucide-react";

export function QuickChaos() {
  const [loading, setLoading] = useState(null);
  const [activeInjections, setActiveInjections] = useState([]);
  const [message, setMessage] = useState("");

  // Available pods for each chaos type
  const chaosTypes = [
    {
      id: "cpu",
      label: "CPU Spike",
      icon: "🔥",
      color: "from-red-500 to-orange-500",
      borderColor: "border-red-500/50",
      glowColor: "shadow-red-500/50",
      pod: "student-portal",
      namespace: "university-frontend",
      description: "95% CPU usage"
    },
    {
      id: "memory",
      label: "Memory Leak",
      icon: "💾",
      color: "from-purple-500 to-pink-500",
      borderColor: "border-purple-500/50",
      glowColor: "shadow-purple-500/50",
      pod: "notification-service",
      namespace: "university-frontend",
      description: "92% memory usage"
    },
    {
      id: "storage",
      label: "Storage Pressure",
      icon: "📦",
      color: "from-yellow-500 to-amber-500",
      borderColor: "border-yellow-500/50",
      glowColor: "shadow-yellow-500/50",
      pod: "attendance-service",
      namespace: "university-backend",
      description: "92% disk full"
    },
    {
      id: "log",
      label: "Log Flood",
      icon: "📝",
      color: "from-cyan-500 to-blue-500",
      borderColor: "border-cyan-500/50",
      glowColor: "shadow-cyan-500/50",
      pod: "notification-service",
      namespace: "university-frontend",
      description: "3+ errors/sec"
    },
    {
      id: "network",
      label: "Network Spike",
      icon: "🌐",
      color: "from-emerald-500 to-teal-500",
      borderColor: "border-emerald-500/50",
      glowColor: "shadow-emerald-500/50",
      pod: "result-service",
      namespace: "university-backend",
      description: "100+ MB/s"
    }
  ];

  const triggerChaos = async (chaos) => {
    setLoading(chaos.id);
    setMessage("");

    try {
      const endpoint = chaos.id === "log" ? "log-flood" : `${chaos.id}-spike`;
      await axios.post(
        `http://localhost:8000/api/simulate/${endpoint}?pod=${chaos.pod}&namespace=${chaos.namespace}`
      );
      
      const injection = {
        id: Date.now(),
        type: chaos.label,
        icon: chaos.icon,
        pod: chaos.pod,
        namespace: chaos.namespace,
        startTime: Date.now(),
        duration: 90000 // 90 seconds
      };
      
      setActiveInjections(prev => [...prev, injection]);
      setMessage(`✓ ${chaos.label} triggered on ${chaos.pod}`);
      
      // Auto-remove after 90 seconds
      setTimeout(() => {
        setActiveInjections(prev => prev.filter(i => i.id !== injection.id));
      }, 90000);
      
    } catch (err) {
      setMessage(`✗ Failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const clearAll = async () => {
    try {
      await axios.post("http://localhost:8000/api/chaos/disable");
      setActiveInjections([]);
      setMessage("✓ All injections cleared");
    } catch (err) {
      setMessage(`✗ Failed to clear: ${err.message}`);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-elevated border border-subtle rounded-lg p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-accent-amber animate-pulse" />
          <h3 className="text-sm font-mono font-semibold text-text-primary">
            Quick Chaos Injection
          </h3>
        </div>
        {activeInjections.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearAll}
            className="flex items-center gap-1 px-3 py-1 rounded bg-red-500/20 border border-red-500/50 text-red-400 text-xs font-mono hover:bg-red-500/30 transition-colors"
          >
            <X size={14} />
            Clear All
          </motion.button>
        )}
      </div>

      {/* Chaos Buttons Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {chaosTypes.map((chaos) => (
          <motion.button
            key={chaos.id}
            onClick={() => triggerChaos(chaos)}
            disabled={loading === chaos.id}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-lg border ${chaos.borderColor} bg-gradient-to-br ${chaos.color} bg-opacity-10 backdrop-blur-sm transition-all duration-300 ${
              loading === chaos.id
                ? "opacity-50 cursor-wait"
                : "hover:shadow-lg hover:" + chaos.glowColor + " cursor-pointer"
            }`}
          >
            {/* Icon */}
            <span className="text-3xl">{chaos.icon}</span>
            
            {/* Label */}
            <div className="text-center">
              <div className="text-xs font-mono font-semibold text-white">
                {chaos.label}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-1">
                {chaos.description}
              </div>
            </div>

            {/* Loading Spinner */}
            {loading === chaos.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Active Injections */}
      <AnimatePresence>
        {activeInjections.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <Clock size={14} />
              Active Injections ({activeInjections.length})
            </div>
            {activeInjections.map((injection) => (
              <ActiveInjectionCard key={injection.id} injection={injection} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message */}
      {message && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`px-3 py-2 rounded text-xs font-mono ${
            message.startsWith("✓")
              ? "bg-emerald-900/20 border border-accent-emerald text-accent-emerald"
              : "bg-red-900/20 border border-accent-red text-accent-red"
          }`}
        >
          {message}
        </motion.div>
      )}

      {/* Info */}
      <div className="flex gap-2 px-3 py-2 rounded bg-cyan-900/10 border border-cyan-500/30 text-xs">
        <Zap size={14} className="text-accent-cyan flex-shrink-0 mt-0.5" />
        <div className="text-text-secondary">
          One-click chaos injection • Auto-recovers in 90s • Perfect for demos
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

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 20, opacity: 0 }}
      className="relative flex items-center gap-3 px-3 py-2 rounded bg-surface border border-subtle overflow-hidden"
    >
      {/* Progress Bar */}
      <div
        className="absolute inset-0 bg-accent-cyan/10 transition-all duration-1000"
        style={{ width: `${progress}%` }}
      />

      {/* Content */}
      <span className="text-lg z-10">{injection.icon}</span>
      <div className="flex-1 z-10">
        <div className="text-xs font-mono text-text-primary">{injection.type}</div>
        <div className="text-[10px] font-mono text-text-muted">
          {injection.pod} • {injection.namespace}
        </div>
      </div>
      <div className="flex items-center gap-1 z-10">
        <Clock size={12} className="text-accent-cyan" />
        <span className="text-xs font-mono text-accent-cyan font-semibold">
          {timeLeft}s
        </span>
      </div>
    </motion.div>
  );
}
