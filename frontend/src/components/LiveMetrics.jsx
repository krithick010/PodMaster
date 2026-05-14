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
        <div className="bg-[#0d1117] border border-[#30363d] p-3 rounded-lg shadow-2xl text-[10px] font-mono">
          <p className="text-gray-500 mb-2 border-b border-[#30363d] pb-1">{label}</p>
          <div className="space-y-1">
            <p className="text-[#10b981] flex justify-between gap-4">
                <span>CPU:</span>
                <span className="font-bold">{payload[0].value}%</span>
            </p>
            <p className="text-[#06b6d4] flex justify-between gap-4">
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
      className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 shadow-2xl h-full flex flex-col"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metricCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#161b22]/50 border border-[#30363d] rounded-xl p-4 relative overflow-hidden group hover:border-[#444c56] transition-all"
          >
            {/* Corner Accent */}
            <div className="absolute top-0 right-0 w-8 h-8 opacity-20 pointer-events-none" 
                 style={{ background: `radial-gradient(circle at top right, ${card.color}, transparent)` }}></div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                <card.icon size={18} />
              </div>
              <span className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-widest">{card.label}</span>
            </div>
            <div className="text-2xl font-mono font-black text-gray-100 tracking-tight"
                 style={{ textShadow: `0 0 20px ${card.glow}` }}>
              {card.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recharts Area Chart */}
      <div className="w-full bg-[#161b22]/30 rounded-xl border border-[#30363d] p-5 relative mt-auto" style={{ height: 240 }}>
        <h4 className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
          Cluster Resource Utilization (Time-Series)
        </h4>
        <div style={{ height: 160 }}>
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
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#484f58"
                fontSize={9}
                tickMargin={10}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#484f58"
                fontSize={9}
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
                stroke="#06b6d4"
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
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-[#30363d]/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[#10b981] rounded-full shadow-[0_0_8px_#10b981]"></div>
            <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">CPU Load</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-[#06b6d4] rounded-full shadow-[0_0_8px_#06b6d4]"></div>
            <span className="text-[9px] font-mono text-gray-400 font-bold uppercase tracking-wider">Memory Pressure</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
