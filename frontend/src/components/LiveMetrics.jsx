import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, Cpu, MemoryStick, HardDrive, Network } from "lucide-react";
import axios from "axios";

export function LiveMetrics() {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/metrics/current");
        setMetrics(response.data.metrics || {});
        setLoading(false);
      } catch (err) {
        console.error("Error fetching metrics:", err);
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Calculate averages across all pods
  const calculateAverages = () => {
    let totalCpu = 0;
    let totalMemory = 0;
    let totalNetwork = 0;
    let podCount = 0;

    Object.values(metrics).forEach((namespace) => {
      Object.values(namespace).forEach((pod) => {
        podCount++;
        
        // CPU - use raw value if no limit
        const cpuUsage = pod.cpu_usage || 0;
        const cpuLimit = pod.cpu_limit || 0;
        if (cpuLimit > 0) {
          totalCpu += (cpuUsage / cpuLimit) * 100;
        } else {
          // Show raw CPU cores usage
          totalCpu += cpuUsage * 100; // Convert to percentage of 1 core
        }

        // Memory - use raw value if no limit
        const memUsage = pod.memory_usage || 0;
        const memLimit = pod.memory_limit || 0;
        if (memLimit > 0) {
          totalMemory += (memUsage / memLimit) * 100;
        } else {
          // Show raw MB
          totalMemory += (memUsage / (1024 * 1024 * 1024)) * 100; // Assume 1GB baseline
        }

        // Network (convert to MB/s)
        const netIn = (pod.network_in || 0) / (1024 * 1024);
        const netOut = (pod.network_out || 0) / (1024 * 1024);
        totalNetwork += netIn + netOut;
      });
    });

    return {
      cpu: podCount > 0 ? (totalCpu / podCount).toFixed(1) : 0,
      memory: podCount > 0 ? (totalMemory / podCount).toFixed(1) : 0,
      network: totalNetwork.toFixed(2),
      pods: podCount,
    };
  };

  const avg = calculateAverages();

  const metricCards = [
    {
      label: "Avg CPU",
      value: `${avg.cpu}%`,
      icon: Cpu,
      color: avg.cpu > 80 ? "text-red-400" : avg.cpu > 50 ? "text-yellow-400" : "text-emerald-400",
      bgColor: avg.cpu > 80 ? "bg-red-500/10" : avg.cpu > 50 ? "bg-yellow-500/10" : "bg-emerald-500/10",
      borderColor: avg.cpu > 80 ? "border-red-500/30" : avg.cpu > 50 ? "border-yellow-500/30" : "border-emerald-500/30",
    },
    {
      label: "Avg Memory",
      value: `${avg.memory}%`,
      icon: MemoryStick,
      color: avg.memory > 80 ? "text-red-400" : avg.memory > 50 ? "text-yellow-400" : "text-cyan-400",
      bgColor: avg.memory > 80 ? "bg-red-500/10" : avg.memory > 50 ? "bg-yellow-500/10" : "bg-cyan-500/10",
      borderColor: avg.memory > 80 ? "border-red-500/30" : avg.memory > 50 ? "border-yellow-500/30" : "border-cyan-500/30",
    },
    {
      label: "Active Pods",
      value: avg.pods,
      icon: Activity,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
    },
  ];

  if (loading) {
    return (
      <div className="bg-elevated border border-subtle rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-accent-cyan animate-pulse" />
          <h3 className="text-xs font-mono font-semibold text-text-secondary uppercase">
            Live Prometheus Metrics
          </h3>
        </div>
        <div className="text-xs text-text-muted">Loading metrics...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-elevated border border-subtle rounded-lg p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent-cyan animate-pulse" />
          <h3 className="text-xs font-mono font-semibold text-text-secondary uppercase">
            Live Prometheus Metrics
          </h3>
        </div>
        <div className="text-[10px] font-mono text-text-muted">
          Updates every 5s
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {metricCards.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg border ${metric.borderColor} ${metric.bgColor}`}
          >
            <metric.icon size={20} className={metric.color} />
            <div className="text-center">
              <div className={`text-lg font-bold font-mono ${metric.color}`}>
                {metric.value}
              </div>
              <div className="text-[10px] font-mono text-text-muted mt-1">
                {metric.label}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pod Details */}
      <div className="mt-3 pt-3 border-t border-subtle">
        <div className="text-[10px] font-mono text-text-muted mb-2">
          Top CPU Consumers:
        </div>
        <div className="space-y-1">
          {Object.entries(metrics)
            .flatMap(([namespace, pods]) =>
              Object.entries(pods).map(([podName, pod]) => {
                const cpuUsage = pod.cpu_usage || 0;
                const cpuLimit = pod.cpu_limit || 0;
                const cpuPercent = cpuLimit > 0 
                  ? (cpuUsage / cpuLimit) * 100 
                  : cpuUsage * 100; // Show as % of 1 core
                
                return {
                  namespace,
                  podName,
                  cpuPercent,
                };
              })
            )
            .sort((a, b) => b.cpuPercent - a.cpuPercent)
            .slice(0, 3)
            .map((pod, idx) => (
              <div
                key={`${pod.namespace}-${pod.podName}`}
                className="flex items-center justify-between text-[10px] font-mono"
              >
                <span className="text-text-secondary truncate flex-1">
                  {pod.podName}
                </span>
                <span
                  className={`font-semibold ${
                    pod.cpuPercent > 80
                      ? "text-red-400"
                      : pod.cpuPercent > 50
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
                >
                  {pod.cpuPercent.toFixed(1)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </motion.div>
  );
}
