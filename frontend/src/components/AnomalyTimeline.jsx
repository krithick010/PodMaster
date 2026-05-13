import React from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";

export function AnomalyTimeline({ anomalies = [] }) {
  const sortedAnomalies = [...anomalies]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "border-l-accent-red bg-red-900/10";
      case "warning":
        return "border-l-accent-amber bg-amber-900/10";
      default:
        return "border-l-accent-cyan bg-cyan-900/10";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "critical":
        return "🔴";
      case "warning":
        return "🟡";
      default:
        return "🔵";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-mono font-600 text-text-secondary uppercase">
        Anomaly Timeline
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedAnomalies.length === 0 ? (
          <div className="text-xs text-text-muted">No anomalies recorded</div>
        ) : (
          sortedAnomalies.map((anomaly, idx) => (
            <motion.div
              key={`${anomaly.timestamp}-${idx}`}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.02 }}
              className={`px-3 py-2 rounded text-xs border-l-2 ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="flex gap-2 justify-between items-start">
                <div className="flex-1">
                  <div className="font-mono font-600">
                    <span>{getSeverityIcon(anomaly.severity)}</span>{" "}
                    <span>{anomaly.pod_name}</span>
                  </div>
                  <div className="text-text-muted mt-1 text-xs">
                    {anomaly.description.substring(0, 60)}
                    {anomaly.description.length > 60 ? "..." : ""}
                  </div>
                  {anomaly.llm_insight && (
                    <div className="text-text-secondary mt-2 text-xs italic border-l-2 border-accent-violet pl-2">
                      💡 {anomaly.llm_insight.substring(0, 80)}
                      {anomaly.llm_insight.length > 80 ? "..." : ""}
                    </div>
                  )}
                </div>
                <div className="text-text-muted text-xs whitespace-nowrap">
                  {format(new Date(anomaly.timestamp), "HH:mm:ss")}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
