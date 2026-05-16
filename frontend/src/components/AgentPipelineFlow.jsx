import React from "react";
import { motion } from "framer-motion";
import { Cpu, Zap, Activity, Database, FileText, Clock, GitMerge, Radio, ArrowRight } from "lucide-react";

const AGENTS = [
  { key: "cpu",        label: "CPU",      Icon: Cpu      },
  { key: "memory",     label: "Memory",   Icon: Zap      },
  { key: "network",    label: "Network",  Icon: Activity },
  { key: "storage",    label: "Storage",  Icon: Database },
  { key: "logio",      label: "LogIO",    Icon: FileText },
  { key: "scheduling", label: "Sched",    Icon: Clock    },
];

const SEV_COLOR = {
  critical: "#ef4444",
  warning:  "#f59e0b",
  ok:       "#10b981",
  info:     "#06b6d4",
  error:    "#6b7280",
};

function NodeBox({ label, Icon, color, status, isLoading, delay = 0 }) {
  const c = color || "#374151";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="flex flex-col items-center gap-1"
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center relative"
        style={{
          background: `${c}15`,
          border: `1.5px solid ${c}40`,
          boxShadow: isLoading ? `0 0 12px ${c}40` : "none",
        }}
      >
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
          >
            <Icon size={16} style={{ color: c }} />
          </motion.div>
        ) : (
          <Icon size={16} style={{ color: c }} />
        )}
        {/* Pulse ring when loading */}
        {isLoading && (
          <motion.div
            className="absolute inset-0 rounded-xl"
            style={{ border: `1.5px solid ${c}` }}
            animate={{ opacity: [0.6, 0], scale: [1, 1.5] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          />
        )}
      </div>
      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
      {status && (
        <span
          className="text-[8px] font-mono font-bold uppercase"
          style={{ color: SEV_COLOR[status] || "#6b7280" }}
        >
          {status}
        </span>
      )}
    </motion.div>
  );
}

export function AgentPipelineFlow({ pipelineAnalysis, pipelineLoading }) {
  const agents = pipelineAnalysis?.agents || {};
  const coordinator = pipelineAnalysis?.coordinator;
  const overallSev = coordinator?.overall_severity;

  return (
    <div
      className="rounded-xl border p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)", borderColor: "#21262d" }}
    >
      {/* Top accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-4" />

      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded bg-cyan-500/10 border border-cyan-500/25">
          <Radio size={13} className="text-cyan-400" />
        </div>
        <span className="text-[10px] font-mono font-bold text-gray-300 uppercase tracking-widest">
          Agent Pipeline Flow
        </span>
        {pipelineLoading && (
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
            className="text-[9px] font-mono text-cyan-400 ml-auto"
          >
            ANALYZING...
          </motion.span>
        )}
        {!pipelineLoading && pipelineAnalysis && (
          <span className="text-[9px] font-mono text-gray-600 ml-auto">
            {new Date(pipelineAnalysis.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        {/* Prometheus source */}
        <NodeBox
          label="Prometheus"
          Icon={Radio}
          color="#06b6d4"
          isLoading={false}
          delay={0}
        />

        <ArrowRight size={14} className="text-gray-700 shrink-0" />

        {/* 6 specialist agents */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {AGENTS.map((agent, i) => {
            const agentData = agents[agent.key];
            const sev = agentData?.severity;
            const color = sev ? SEV_COLOR[sev] : "#374151";
            return (
              <React.Fragment key={agent.key}>
                <NodeBox
                  label={agent.label}
                  Icon={agent.Icon}
                  color={color}
                  status={sev}
                  isLoading={pipelineLoading}
                  delay={0.05 * i}
                />
                {i < AGENTS.length - 1 && (
                  <div className="w-px h-6 bg-gray-800 hidden xl:block" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <ArrowRight size={14} className="text-gray-700 shrink-0" />

        {/* Coordinator */}
        <NodeBox
          label="Coordinator"
          Icon={GitMerge}
          color={overallSev ? SEV_COLOR[overallSev] : "#8b5cf6"}
          status={overallSev}
          isLoading={pipelineLoading}
          delay={0.4}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      />
    </div>
  );
}
