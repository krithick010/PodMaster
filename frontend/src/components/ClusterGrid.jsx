import React from "react";
import { motion } from "framer-motion";
import { Server, CheckCircle2, AlertTriangle, XCircle, Activity } from "lucide-react";

export function ClusterGrid({ metrics, anomalies }) {
  if (!metrics || Object.keys(metrics).length === 0) {
    return null;
  }

  const namespaces = Object.keys(metrics);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-elevated border-subtle rounded-xl p-6 w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-text flex items-center gap-2 tracking-wide uppercase">
          <Activity className="w-4 h-4 text-accent-cyan" />
          Cluster Status Grid
        </h3>
        <div className="flex items-center gap-4 text-xs font-mono font-500">
          <div className="flex items-center gap-1.5 text-text-muted">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            Healthy
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            Warning
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
            Critical
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {namespaces.map((namespace, nsIdx) => {
          const pods = metrics[namespace];
          const podNames = Object.keys(pods);

          return (
            <motion.div
              key={namespace}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: nsIdx * 0.1 }}
              className="bg-base rounded-lg border border-subtle overflow-hidden flex flex-col"
            >
              <div className="bg-surface px-4 py-3 border-b border-subtle flex items-center justify-between">
                <div className="text-xs font-bold text-text-secondary uppercase tracking-wider truncate">
                  {namespace}
                </div>
                <div className="text-[10px] font-mono text-text-muted bg-base px-2 py-0.5 rounded-full border border-subtle">
                  {podNames.length} PODS
                </div>
              </div>

              <div className="p-4 grid grid-cols-1 gap-3 flex-1 content-start">
                {podNames.map((podName, podIdx) => {
                  // Determine status
                  const podAnomalies = anomalies.filter((a) => a.pod_name === podName);
                  let status = "healthy";
                  if (podAnomalies.some((a) => a.severity === "critical")) {
                    status = "critical";
                  } else if (podAnomalies.some((a) => a.severity === "warning")) {
                    status = "warning";
                  }

                  // Determine colors and icons based on status
                  const isCritical = status === "critical";
                  const isWarning = status === "warning";
                  
                  const bgClass = isCritical
                    ? "bg-red-900/20 border-red-500"
                    : isWarning
                    ? "bg-amber-900/20 border-amber-500"
                    : "bg-surface border-gray-700 hover:border-gray-500";
                    
                  const iconClass = isCritical
                    ? "text-accent-red"
                    : isWarning
                    ? "text-accent-amber"
                    : "text-emerald-500";
                    
                  const Icon = isCritical
                    ? XCircle
                    : isWarning
                    ? AlertTriangle
                    : CheckCircle2;

                  return (
                    <motion.div
                      key={podName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (nsIdx * 0.1) + (podIdx * 0.05) }}
                      className={`relative overflow-hidden group border rounded-md p-3 transition-colors duration-300 ${bgClass}`}
                    >
                      {/* Pulsing background for critical */}
                      {isCritical && (
                        <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                      )}
                      
                      <div className="relative z-10 flex items-start gap-3">
                        <div className={`mt-0.5 ${iconClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-mono font-600 text-text truncate">
                            {podName}
                          </div>
                          
                          {/* Mini metrics bar */}
                          {status === "healthy" ? (
                            <div className="text-[10px] text-text-muted mt-1 flex items-center gap-2 font-mono">
                              <span className="flex items-center gap-1"><Server className="w-3 h-3" /> OK</span>
                            </div>
                          ) : (
                            <div className="text-[10px] mt-1.5 space-y-1.5">
                              {podAnomalies.slice(0, 2).map((a, i) => (
                                <div key={i} className={`truncate font-mono ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                                  ▶ {a.description.split(' ').slice(0, 8).join(' ')}...
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
