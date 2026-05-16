import React from "react";
import { Cpu, Zap, Activity, Database, FileText, Clock } from "lucide-react";
import { motion } from "framer-motion";

const AGENT_ICONS = {
  "CPU Agent": Cpu,
  "Memory Agent": Zap,
  "Network Agent": Activity,
  "Storage Agent": Database,
  "LogIO Agent": FileText,
  "Scheduling Agent": Clock,
};

const STATUS_COLORS = {
  idle: "text-text-muted",
  running: "text-accent-cyan",
  alert: "text-accent-red",
  error: "text-accent-red",
};

export function AgentStatusStrip({ agents = [] }) {
  return (
    <div className="px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
      {agents.map((agent, idx) => {
        const Icon = AGENT_ICONS[agent.name] || Activity;
        const statusColor = STATUS_COLORS[agent.status] || STATUS_COLORS.idle;

        return (
          <motion.div
            key={agent.name}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-subtle ${
              agent.status === "alert" ? "bg-elevated" : "bg-surface"
            } ${agent.status === "alert" ? "border-accent-red" : "border-subtle"}`}
          >
            <div className="flex items-center gap-2">
              {agent.status === "running" ? (
                <Icon size={14} className={`spin ${statusColor}`} />
              ) : (
                <Icon size={14} className={statusColor} />
              )}
              <span className="text-xs font-mono font-500 text-text-secondary whitespace-nowrap">
                {agent.name.split(" ")[0]}
              </span>
            </div>
            <div className="text-xs font-mono text-text-muted">
              {agent.findings_count || 0}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
