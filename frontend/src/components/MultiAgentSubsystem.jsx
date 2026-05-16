import React from "react";
import { Cpu, Zap, Database, FileText, Activity, Clock, ShieldCheck, AlertOctagon, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { useWebSocket } from "../hooks/useWebSocket";

const AGENT_CONFIGS = [
  {
    name: "CPU Agent",
    role: "Kernel Throttling & Spike Discovery",
    desc: "Monitors container CPU shares and cgroup throttling events in real-time to detect runaway loops and unoptimized background worker threads.",
    icon: Cpu,
    color: "accent-red",
    bg: "bg-accent-red/10",
    border: "border-accent-red/20",
    text: "text-accent-red",
    defaultStatus: "ACTIVE (BPF SECURE)",
    defaultTarget: "university-backend/result-service",
    defaultMetrics: "Throttling: 0.0%, Load: Normal",
  },
  {
    name: "Memory Agent",
    role: "OOMKill Prediction & Leak Tracking",
    desc: "Analyzes working set memory growth curves over time using EWMA algorithms to predict impending Out-Of-Memory container terminations.",
    icon: Zap,
    color: "accent-amber",
    bg: "bg-accent-amber/10",
    border: "border-accent-amber/20",
    text: "text-accent-amber",
    defaultStatus: "ACTIVE (EWMA TRACKING)",
    defaultTarget: "university-data/postgres",
    defaultMetrics: "Working Set: Nominal (<80%)",
  },
  {
    name: "Network Agent",
    role: "Dependency Mapping & Latency Profiling",
    desc: "Inspects TCP retransmissions, socket exhaustion, and ingress/egress bandwidth to construct real-time service interdependency topologies.",
    icon: Activity,
    color: "accent-cyan",
    bg: "bg-accent-cyan/10",
    border: "border-accent-cyan/20",
    text: "text-accent-cyan",
    defaultStatus: "ACTIVE (mTLS INSPECT)",
    defaultTarget: "university-frontend/student-portal",
    defaultMetrics: "RPC Latency: 32ms (Nominal)",
  },
  {
    name: "Storage Agent",
    role: "PVC Pressure & Disk IOPS Triage",
    desc: "Correlates persistent volume claim utilization and disk read/write bandwidth with container restart loops and I/O wait stalls.",
    icon: Database,
    color: "accent-violet",
    bg: "bg-accent-violet/10",
    border: "border-accent-violet/20",
    text: "text-accent-violet",
    defaultStatus: "ACTIVE (NFS/EBS SYNC)",
    defaultTarget: "university-backend/attendance-storage",
    defaultMetrics: "PVC Usage: Nominal (<80%)",
  },
  {
    name: "LogIO Agent",
    role: "Exception Burst & Stack Clustering",
    desc: "Ingests standard error streams across all namespaces to cluster and categorize sudden bursts of 5xx HTTP exceptions or database connection timeouts.",
    icon: FileText,
    color: "accent-emerald",
    bg: "bg-accent-emerald/10",
    border: "border-accent-emerald/20",
    text: "text-accent-emerald",
    defaultStatus: "ACTIVE (LOG STALL FREE)",
    defaultTarget: "All Namespaces",
    defaultMetrics: "Error Rate: 0.12 err/s",
  },
  {
    name: "Scheduling Agent",
    role: "Pending Workload & Taint Verification",
    desc: "Continuously validates pod scheduling constraints, affinity inline affinity rules, and node resource exhaustion to diagnose CrashLoopBackOff and Pending pods.",
    icon: Clock,
    color: "accent-blue",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    text: "text-blue-500",
    defaultStatus: "ACTIVE (SCHEDULER SYNC)",
    defaultTarget: "university-backend/result-service-0",
    defaultMetrics: "Restarts: 0 (Stable)",
  },
];

export function MultiAgentSubsystem() {
  const { agentStatuses, anomalies } = useWebSocket();

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-sm font-sans text-primary relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02]"
           style={{ backgroundImage: 'linear-gradient(90deg, #000 1px, transparent 1px), linear-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-6 border-b border-subtle gap-4 relative z-10 font-sans">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent-violet/10 border border-accent-violet/20 rounded-xl shadow-2xs">
            <Terminal size={22} className="text-accent-violet animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-primary uppercase tracking-wider font-display">
              Autonomous AI Agents Daemonset
            </h2>
            <div className="text-xs font-mono text-muted mt-0.5">
              REAL-TIME POD RESOURCE DISCOVERY & CROSS-POD DEPENDENCY MAPPING
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-elevated px-3 py-1.5 rounded-lg border border-subtle shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-accent-emerald animate-ping" />
          <span className="text-xs font-mono font-bold text-primary">{agentStatuses.length || 6} DAEMONS SYNCHRONIZED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10 font-sans">
        {AGENT_CONFIGS.map((agent, i) => {
          const Icon = agent.icon;
          const liveAgent = agentStatuses.find((a) => a.name === agent.name);
          const agentAnomalies = anomalies.filter((a) => a.agent_name === agent.name);
          const latestAnomaly = agentAnomalies[0];

          let displayStatus = agent.defaultStatus;
          let displayTarget = agent.defaultTarget;
          let displayMetrics = agent.defaultMetrics;

          if (liveAgent) {
            if (liveAgent.status === "alert" || agentAnomalies.length > 0) {
              if (latestAnomaly) {
                displayStatus = latestAnomaly.severity === "critical" ? `ALERT (${latestAnomaly.anomaly_type})` : `WARN (${latestAnomaly.anomaly_type})`;
                displayTarget = `${latestAnomaly.namespace}/${latestAnomaly.pod_name}`;
                displayMetrics = latestAnomaly.description;
              } else {
                displayStatus = "ALERT (ANOMALY DETECTED)";
                displayMetrics = `Findings: ${liveAgent.findings_count} active issues`;
              }
            } else if (liveAgent.status === "error") {
              displayStatus = "ERROR (SENSOR FAULT)";
              displayMetrics = liveAgent.last_error || "Agent execution failure";
            } else {
              displayStatus = agent.defaultStatus;
              displayMetrics = `Findings: 0 (System Nominal)`;
            }
          }

          const isAlert = displayStatus.startsWith("WARN") || displayStatus.startsWith("ALERT");

          return (
            <motion.div
              key={agent.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-elevated border rounded-xl p-5 relative overflow-hidden flex flex-col justify-between shadow-2xs transition-all hover:bg-surface ${
                isAlert ? "border-accent-red/40 bg-accent-red/[0.02]" : "border-subtle"
              }`}
            >
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 w-1.5 h-full bg-${agent.color}`} />

              <div>
                <div className="flex items-start justify-between gap-3 mb-3 font-sans">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg border shadow-2xs ${agent.bg} ${agent.text} ${agent.border}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary tracking-tight">{agent.name}</h3>
                      <div className="text-[11px] font-mono font-bold text-accent-violet mt-0.5">{agent.role}</div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-secondary leading-relaxed mb-4 pl-0.5 font-sans">
                  {agent.desc}
                </p>
              </div>

              <div className="pt-3 border-t border-subtle mt-2 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Target Scope:</span>
                  <span className="font-semibold text-primary truncate max-w-[180px] bg-surface px-2 py-0.5 rounded border border-subtle">{displayTarget}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Real-Time State:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase border ${
                    isAlert ? "bg-accent-red/10 text-accent-red border-accent-red/20 animate-pulse" : "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20"
                  }`}>{displayStatus}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted pt-1">
                  <span>Sensor Telemetry:</span>
                  <span className="font-mono text-primary font-semibold truncate max-w-[220px]" title={displayMetrics}>{displayMetrics}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
