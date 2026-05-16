import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Cpu, MemoryStick, HardDrive, Network } from "lucide-react";
import axios from "axios";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function LiveMetrics({ anomalies, selectedPod = "all" }) {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/metrics/current");
        const newMetrics = response.data.metrics || {};
        setMetrics(newMetrics);
        
        let totalCpu = 0;
        let totalMemory = 0;
        let podCount = 0;

        Object.values(newMetrics).forEach((namespace) => {
          Object.entries(namespace).forEach(([podName, pod]) => {
            if (selectedPod !== "all" && podName !== selectedPod) return;
            
            podCount++;
            const cpuUsage = pod.cpu_usage || 0;
            const cpuLimit = pod.cpu_limit || 0;
            if (cpuLimit > 0) totalCpu += (cpuUsage / cpuLimit) * 100;
            else totalCpu += cpuUsage * 100;

            const memUsage = pod.memory_usage || 0;
            const memLimit = pod.memory_limit || 0;
            if (memLimit > 0) totalMemory += (memUsage / memLimit) * 100;
            else totalMemory += (memUsage / (1024 * 1024 * 1024)) * 100;
          });
        });

        const avgCpu = podCount > 0 ? totalCpu / podCount : 0;
        const avgMem = podCount > 0 ? totalMemory / podCount : 0;
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        setHistory(prev => {
          const newHistory = [...prev, { time: timeStr, cpu: Number(avgCpu.toFixed(1)), memory: Number(avgMem.toFixed(1)) }];
          return newHistory.slice(-15);
        });

        setLoading(false);
      } catch (err) {
        console.error("Error fetching metrics:", err);
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);

    return () => clearInterval(interval);
  }, [selectedPod]);

  // Calculate averages across all pods for the stat cards
  const calculateAverages = () => {
    let totalCpu = 0;
    let totalMemory = 0;
    let totalNetwork = 0;
    let podCount = 0;

    Object.values(metrics).forEach((namespace) => {
      Object.entries(namespace).forEach(([podName, pod]) => {
        if (selectedPod !== "all" && podName !== selectedPod) return;
        
        podCount++;
        const cpuUsage = pod.cpu_usage || 0;
        const cpuLimit = pod.cpu_limit || 0;
        if (cpuLimit > 0) totalCpu += (cpuUsage / cpuLimit) * 100;
        else totalCpu += cpuUsage * 100;

        const memUsage = pod.memory_usage || 0;
        const memLimit = pod.memory_limit || 0;
        if (memLimit > 0) totalMemory += (memUsage / memLimit) * 100;
        else totalMemory += (memUsage / (1024 * 1024 * 1024)) * 100;

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
      color: avg.cpu > 80 ? "#ef4444" : avg.cpu > 50 ? "#f59e0b" : "#10b981",
      glow: avg.cpu > 80 ? "rgba(239, 68, 68, 0.4)" : avg.cpu > 50 ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)",
    },
    {
      label: "Avg Memory",
      value: `${avg.memory}%`,
      icon: MemoryStick,
      color: avg.memory > 80 ? "#ef4444" : avg.memory > 50 ? "#f59e0b" : "#06b6d4",
      glow: avg.memory > 80 ? "rgba(239, 68, 68, 0.4)" : avg.memory > 50 ? "rgba(245, 158, 11, 0.3)" : "rgba(6, 182, 212, 0.3)",
    },
    {
      label: "Network",
      value: avg.network > 0 ? `${avg.network} MB/s` : "0.00",
      icon: Network,
      color: "#a78bfa",
      glow: "rgba(167, 139, 250, 0.3)",
    },
    {
      label: "Active Pods",
      value: avg.pods,
      icon: Activity,
      color: "#3b82f6",
      glow: "rgba(59, 130, 246, 0.3)",
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-subtle p-3 rounded-lg shadow-lg text-[10px] font-mono text-primary font-sans">
          <p className="text-muted mb-2 border-b border-subtle pb-1 font-bold">{label}</p>
          <div className="space-y-1.5 font-mono">
            <p className="text-accent-emerald flex justify-between gap-4">
                <span>CPU:</span>
                <span className="font-bold">{payload[0].value}%</span>
            </p>
            <p className="text-accent-cyan flex justify-between gap-4">
                <span>MEM:</span>
                <span className="font-bold">{payload[1].value}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-surface border border-subtle rounded-xl p-6 shadow-sm h-full flex flex-col text-primary font-sans"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
        {metricCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-elevated border border-subtle rounded-xl p-4 relative overflow-hidden group hover:border-accent-violet transition-all shadow-xs"
          >
            {/* Corner Accent */}
            <div className="absolute top-0 right-0 w-8 h-8 opacity-20 pointer-events-none" 
                 style={{ background: `radial-gradient(circle at top right, ${card.color}, transparent)` }}></div>
            
            <div className="flex items-center gap-3 mb-2 font-mono font-medium">
              <div className="p-2.5 rounded-lg shadow-2xs" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                <card.icon size={18} />
              </div>
              <span className="text-xs text-muted uppercase tracking-wider">{card.label}</span>
            </div>
            <div className="text-2xl font-black text-primary tracking-tight font-mono mt-1"
                 style={{ textShadow: `0 0 20px ${card.glow}` }}>
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recharts Area Chart */}
      <div className="w-full bg-elevated/40 rounded-xl border border-subtle p-5 relative mt-auto shadow-inner" style={{ height: 260 }}>
        <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4 font-sans">
          Cluster Resource Utilization (Time-Series)
        </h4>
        <div style={{ height: 170 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={history}
              margin={{ top: 4, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-border)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--text-muted)"
                fontSize={10}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="var(--text-muted)"
                fontSize={10}
                tickFormatter={(val) => `${val}%`}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cpu"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCpu)"
                isAnimationActive={false}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="memory"
                stroke="#0284c7"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorMem)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-subtle font-mono">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-accent-emerald rounded-full shadow-2xs"></div>
            <span className="text-xs text-muted font-bold uppercase tracking-wider">CPU Load</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-accent-cyan rounded-full shadow-2xs"></div>
            <span className="text-xs text-muted font-bold uppercase tracking-wider">Memory Pressure</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
