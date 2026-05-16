import React, { useState, useEffect } from "react";
import axios from "axios";
import { ShieldAlert, AlertTriangle, Bot, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export function HealthScore() {
  const [scoreData, setScoreData] = useState({
    health_score: 100,
    grade: "A",
    critical_anomalies: 0,
    warning_anomalies: 0,
    agents_active: 0,
  });

  useEffect(() => {
    const fetchScore = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/summary/health");
        setScoreData(res.data);
      } catch (e) { console.error(e); }
    };
    fetchScore();
    const interval = setInterval(fetchScore, 5000);
    return () => clearInterval(interval);
  }, []);

  const score = scoreData.health_score ?? 100;
  const grade = scoreData.grade ?? "A";

  const R = 28;
  const circumference = 2 * Math.PI * R;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const gradeConfig = {
    A: { stroke: "#10b981", glow: "rgba(16,185,129,0.5)", textClass: "text-emerald-400", label: "Optimal" },
    B: { stroke: "#06b6d4", glow: "rgba(6,182,212,0.5)", textClass: "text-cyan-400", label: "Good" },
    C: { stroke: "#f59e0b", glow: "rgba(245,158,11,0.5)", textClass: "text-amber-400", label: "Degraded" },
    D: { stroke: "#f97316", glow: "rgba(249,115,22,0.5)", textClass: "text-orange-400", label: "At Risk" },
    F: { stroke: "#ef4444", glow: "rgba(239,68,68,0.5)", textClass: "text-red-400", label: "Critical" },
  }[grade] || { stroke: "#6b7280", glow: "rgba(107,114,128,0.3)", textClass: "text-gray-400", label: "Unknown" };

  return (
    <div
      className="rounded-xl border overflow-hidden shadow-xl w-full"
      style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", borderColor: "#30363d" }}
    >
      {/* Top accent line */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${gradeConfig.stroke}, transparent)` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid #21262d" }}>
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} style={{ color: gradeConfig.stroke }} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "#8b949e" }}>
            Cluster Fitness
          </span>
        </div>
        <span
          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${gradeConfig.stroke}20`, color: gradeConfig.stroke, border: `1px solid ${gradeConfig.stroke}40` }}
        >
          {gradeConfig.label}
        </span>
      </div>

      {/* Body — gauge left, stats right */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Donut */}
        <div className="relative shrink-0" style={{ width: 68, height: 68 }}>
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle cx="34" cy="34" r={R} fill="none" stroke="#ffffff08" strokeWidth="6" />
            <motion.circle
              cx="34" cy="34" r={R}
              fill="none"
              stroke={gradeConfig.stroke}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
              transform="rotate(-90 34 34)"
              style={{ filter: `drop-shadow(0 0 6px ${gradeConfig.glow})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-black font-mono leading-none ${gradeConfig.textClass}`}
              style={{ textShadow: `0 0 16px ${gradeConfig.glow}` }}>
              {grade}
            </span>
            <span className="text-[9px] font-mono mt-0.5" style={{ color: "#4b5563" }}>{score}%</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 space-y-2 min-w-0">
          {[
            { Icon: ShieldAlert, label: "Critical", val: scoreData.critical_anomalies, color: scoreData.critical_anomalies > 0 ? "#ef4444" : "#4b5563" },
            { Icon: AlertTriangle, label: "Warnings", val: scoreData.warning_anomalies, color: scoreData.warning_anomalies > 0 ? "#f59e0b" : "#4b5563" },
            { Icon: Bot, label: "Agents", val: scoreData.agents_active, color: "#06b6d4" },
          ].map(({ Icon, label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon size={10} style={{ color }} />
                <span className="text-[10px] font-mono" style={{ color: "#6b7280" }}>{label}</span>
              </div>
              <span className="text-xs font-mono font-bold tabular-nums" style={{ color }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
