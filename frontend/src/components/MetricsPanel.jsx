import React from "react";
import { motion } from "framer-motion";

export function MetricsPanel({ metrics = {}, namespace = "all" }) {
  // Convert metrics object to array format
  const metricsArray = [];
  for (const [ns, pods] of Object.entries(metrics)) {
    if (namespace !== "all" && ns !== namespace) continue;
    for (const [podName, data] of Object.entries(pods)) {
      metricsArray.push({
        namespace: ns,
        pod: podName,
        ...data,
      });
    }
  }

  const getMetricColor = (usage, limit) => {
    if (!limit) return "bg-accent-cyan";
    const percentage = (usage / limit) * 100;
    if (percentage < 60) return "bg-accent-emerald";
    if (percentage < 80) return "from-accent-amber to-accent-amber";
    return "from-accent-red to-accent-red";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-600 text-text-secondary uppercase">
        Resource Metrics
      </h3>
      <div className="grid gap-4">
        {metricsArray.length === 0 ? (
          <div className="text-xs text-text-muted">No metrics available</div>
        ) : (
          metricsArray.map((metric, idx) => (
            <motion.div
              key={`${metric.namespace}-${metric.pod}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-surface border-subtle rounded-lg p-4 space-y-3"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono font-600 text-sm">{metric.pod}</div>
                  <div className="text-xs text-text-muted">{metric.namespace}</div>
                </div>
                {metric.restart_count > 0 && (
                  <div className="px-2 py-1 bg-red-900/20 border border-accent-red rounded text-xs font-mono text-accent-red">
                    {metric.restart_count} restarts
                  </div>
                )}
              </div>

              {/* CPU Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">CPU</span>
                  <span className="font-mono text-accent-cyan">
                    {metric.cpu_usage ? metric.cpu_usage.toFixed(0) : 0}m /{" "}
                    {metric.cpu_limit || "?"}m
                  </span>
                </div>
                <div className="w-full h-1 bg-bg-border rounded overflow-hidden">
                  <motion.div
                    className={`h-full ${getMetricColor(metric.cpu_usage, metric.cpu_limit)}`}
                    initial={{ width: 0 }}
                    animate={{
                      width: metric.cpu_limit
                        ? `${Math.min(100, (metric.cpu_usage / metric.cpu_limit) * 100)}%`
                        : "0%",
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Memory Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Memory</span>
                  <span className="font-mono text-accent-cyan">
                    {metric.memory_usage ? (metric.memory_usage / 1024 / 1024).toFixed(0) : 0}Mi /{" "}
                    {metric.memory_limit ? (metric.memory_limit / 1024 / 1024).toFixed(0) : "?"}Mi
                  </span>
                </div>
                <div className="w-full h-1 bg-bg-border rounded overflow-hidden">
                  <motion.div
                    className={`h-full ${getMetricColor(metric.memory_usage, metric.memory_limit)}`}
                    initial={{ width: 0 }}
                    animate={{
                      width: metric.memory_limit
                        ? `${Math.min(100, (metric.memory_usage / metric.memory_limit) * 100)}%`
                        : "0%",
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Network */}
              {(metric.network_in || metric.network_out) && (
                <div className="flex gap-3 text-xs font-mono text-text-secondary">
                  <span>↓ {(metric.network_in / 1024 / 1024).toFixed(2)}MB/s</span>
                  <span>↑ {(metric.network_out / 1024 / 1024).toFixed(2)}MB/s</span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
