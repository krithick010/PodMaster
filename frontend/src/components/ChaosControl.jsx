import React, { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Zap, AlertTriangle } from "lucide-react";

export function ChaosControl({ pods = [] }) {
  const [loading, setLoading] = useState(false);
  const [selectedPod, setSelectedPod] = useState(pods[0]?.pod || "");
  const [selectedNs, setSelectedNs] = useState(pods[0]?.namespace || "");
  const [message, setMessage] = useState("");

  const simulators = [
    { id: "cpu", label: "CPU Spike", icon: "📈", color: "text-accent-amber" },
    { id: "memory", label: "Memory Leak", icon: "💾", color: "text-accent-amber" },
    { id: "storage", label: "Storage Pressure", icon: "💿", color: "text-accent-red" },
    { id: "logs", label: "Log Flood", icon: "📝", color: "text-accent-red" },
    { id: "network", label: "Network Spike", icon: "🌐", color: "text-accent-cyan" },
  ];

  const runSimulation = async (type) => {
    if (!selectedPod || !selectedNs) {
      setMessage("Select a pod first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await axios.post(
        `http://localhost:8000/api/simulate/${type}-spike?pod=${selectedPod}&namespace=${selectedNs}`
      );
      setMessage(`✓ ${type} simulation started (auto-recover in 90s)`);
    } catch (err) {
      setMessage(`✗ Simulation failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-elevated border-subtle rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap size={18} className="text-accent-amber" />
        <h3 className="text-xs font-mono font-600 text-text-secondary uppercase">
          Chaos Simulation (Testing)
        </h3>
      </div>

      {/* Pod Selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-text-secondary">Target Pod</label>
        <select
          value={selectedPod}
          onChange={(e) => setSelectedPod(e.target.value)}
          className="w-full bg-surface border-subtle px-3 py-2 rounded text-sm font-mono cursor-pointer hover:border-accent-cyan transition-colors"
        >
          <option value="">Choose a pod...</option>
          {pods.map((p) => (
            <option key={`${p.namespace}-${p.pod}`} value={p.pod}>
              {p.pod} ({p.namespace})
            </option>
          ))}
        </select>
      </div>

      {/* Simulators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {simulators.map((sim) => (
          <motion.button
            key={sim.id}
            onClick={() => runSimulation(sim.id)}
            disabled={loading || !selectedPod}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex flex-col items-center gap-1 px-2 py-3 rounded border-subtle text-xs font-mono transition-all ${
              loading || !selectedPod
                ? "bg-surface text-text-muted opacity-50 cursor-not-allowed"
                : "bg-surface hover:bg-elevated cursor-pointer border-subtle hover:border-accent-cyan"
            }`}
          >
            <span className="text-lg">{sim.icon}</span>
            <span className={sim.color}>{sim.label}</span>
          </motion.button>
        ))}
      </div>

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

      {/* Warning */}
      <div className="flex gap-2 px-3 py-2 rounded bg-amber-900/10 border border-accent-amber text-xs">
        <AlertTriangle size={14} className="text-accent-amber flex-shrink-0 mt-0.5" />
        <div className="text-text-secondary">
          Simulated anomalies auto-recover after 90 seconds
        </div>
      </div>
    </motion.div>
  );
}
