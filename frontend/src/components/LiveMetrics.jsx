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

export function LiveMetrics({ anomalies }) {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get("http://localhost:8000/api/metrics/current");
        const newMetrics = response.data.metrics || {};
        setMetrics(newMetrics);
        
        // Calculate current averages to store in history for the chart
        let totalCpu = 0;
        let totalMemory = 0;
        let podCount = 0;

        Object.values(newMetrics).forEach((namespace) => {
          Object.values(namespace).forEach((pod) => {
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
          // Keep last 15 data points
          return newHistory.slice(-15);
        });

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

  // Calculate averages across all pods for the stat cards
  const calculateAverages = () => {
    let totalCpu = 0;
    let totalMemory = 0;
    let totalNetwork = 0;
    let podCount = 0;

    Object.values(metrics).forEach((namespace) => {
      Object.values(namespace).forEach((pod) => {
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
      label: "Network",
      value: avg.network > 0 ? `${avg.network} MB/s` : "N/A",
      icon: Network,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/30",
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-elevated border border-subtle p-2 rounded shadow-lg text-xs font-mono">
          <p className="text-text-secondary mb-1">{label}</p>
          <p className="text-emerald-400">CPU: {payload[0].value}%</p>
          <p className="text-cyan-400">Memory: {payload[1].value}%</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-elevated border border-subtle rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={18} className="text-accent-cyan animate-pulse" />
          <h3 className="text-sm font-bold text-text flex items-center gap-2 tracking-wide uppercase">
            Live Prometheus Metrics
          </h3>
        </div>
        <div className="text-sm text-text-muted font-mono animate-pulse">Gathering telemetry...</div>
      </div>
    );
  }

  const hasFakeChaos = anomalies?.some(a => a.agent_name === "ChaosEngine");

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-elevated border border-subtle rounded-xl p-5 flex flex-col h-full relative overflow-hidden"
    >
      {/* Fake Chaos Overlay */}
      <AnimatePresence>
        {hasFakeChaos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm border-2 border-red-500/50 rounded-xl"
          >
            <div className="bg-red-900/40 border border-red-500 px-6 py-3 rounded-lg flex items-center gap-3 shadow-2xl shadow-red-500/20">
              <Activity className="text-red-500 animate-pulse w-6 h-6" />
              <div>
                <div className="text-red-500 font-bold font-mono tracking-widest text-lg">
                  SIMULATION ACTIVE
                </div>
                <div className="text-red-400 text-xs font-mono">
                  Live metrics obscured by Chaos Engine payload
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex flex-col h-full transition-all duration-500 ${hasFakeChaos ? 'opacity-20 blur-[2px] grayscale pointer-events-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-accent-cyan animate-pulse" />
          <h3 className="text-sm font-bold text-text flex items-center gap-2 tracking-wide uppercase">
            Live Prometheus Metrics
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <div className="text-[10px] font-mono text-text-muted font-600 tracking-wider">
            LIVE SYNC
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {metricCards.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`flex flex-col p-4 rounded-lg border ${metric.borderColor} ${metric.bgColor} hover:bg-opacity-20 transition-all`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="text-[10px] font-mono font-600 text-text-muted uppercase tracking-wider">
                {metric.label}
              </div>
              <metric.icon size={16} className={`${metric.color} opacity-80`} />
            </div>
            <div className={`text-2xl font-bold font-mono tracking-tight ${metric.color}`}>
              {metric.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recharts Area Chart */}
      <div className="flex-1 w-full min-h-[220px] bg-base rounded-lg border border-subtle p-4 relative">
        <h4 className="text-[10px] font-mono font-600 text-text-muted uppercase tracking-wider mb-4 absolute top-4 left-4 z-10">
          Cluster Resource Utilization (Time-Series)
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={history}
            margin={{ top: 25, right: 10, left: -20, bottom: 0 }}
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
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="time" 
              stroke="#6b7280" 
              fontSize={10} 
              tickMargin={10} 
              axisLine={false} 
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280" 
              fontSize={10} 
              tickFormatter={(val) => `${val}%`} 
              axisLine={false} 
              tickLine={false}
              domain={[0, 100]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cpu"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCpu)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="memory"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMem)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>
    </motion.div>
  );
}
