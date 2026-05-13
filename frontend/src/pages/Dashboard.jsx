import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { Header } from "../components/Header";
import { AgentStatusStrip } from "../components/AgentStatusStrip";
import { HealthScore } from "../components/HealthScore";
import { QuickChaos } from "../components/QuickChaos";
import { LiveMetrics } from "../components/LiveMetrics";
import { useWebSocket } from "../hooks/useWebSocket";
import { useNamespace } from "../hooks/useNamespace";
import { useNamespaceContext } from "../context/NamespaceContext";

export function Dashboard() {
  const { metrics, anomalies, agentStatuses, connectionStatus } = useWebSocket();
  const { namespaces } = useNamespace();
  const { selectedNamespace } = useNamespaceContext();
  const [recommendations, setRecommendations] = useState([]);
  const [healthData, setHealthData] = useState({
    score: 100,
    grade: "A",
    critical: 0,
    warning: 0,
  });

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const response = await axios.get(
          "http://localhost:8000/api/recommendations"
        );
        setRecommendations(response.data.recommendations || []);
      } catch (err) {
        console.error("Error fetching recommendations:", err);
      }
    };

    const interval = setInterval(fetchRecommendations, 15000);
    fetchRecommendations();

    return () => clearInterval(interval);
  }, []);

  // Update health score based on anomalies
  useEffect(() => {
    const criticalCount = anomalies.filter(
      (a) => a.severity === "critical"
    ).length;
    const warningCount = anomalies.filter((a) => a.severity === "warning").length;

    let score = 100 - (criticalCount * 10 + warningCount * 3);
    score = Math.max(0, Math.min(100, score));

    let grade = "A";
    if (score >= 90) grade = "A";
    else if (score >= 80) grade = "B";
    else if (score >= 70) grade = "C";
    else if (score >= 60) grade = "D";
    else grade = "F";

    setHealthData({ score, grade, critical: criticalCount, warning: warningCount });
  }, [anomalies]);

  // Filter anomalies by namespace
  const filteredAnomalies =
    selectedNamespace === "all"
      ? anomalies
      : anomalies.filter((a) => a.namespace === selectedNamespace);

  // Count pods
  const podCount = Object.values(metrics).reduce(
    (sum, ns) => sum + Object.keys(ns).length,
    0
  );

  return (
    <div className="flex flex-col h-full w-full bg-base">
      {/* Header */}
      <Header
        podCount={podCount}
        criticalCount={healthData.critical}
        connectionStatus={connectionStatus}
        namespaces={namespaces}
      />

      {/* Agent Status Strip */}
      <AgentStatusStrip agents={agentStatuses} />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-base p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
          className="max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Chaos Injection */}
            <div className="lg:col-span-3">
              <QuickChaos />
            </div>

            {/* Live Prometheus Metrics */}
            <div className="lg:col-span-3">
              <LiveMetrics />
            </div>

            {/* Health Score */}
            <HealthScore {...healthData} />

            {/* Critical Anomalies */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-elevated border-subtle rounded-lg p-6 flex flex-col"
            >
              <h3 className="text-xs font-mono font-600 text-text-secondary mb-3 uppercase">
                Active Issues
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                {filteredAnomalies.length === 0 ? (
                  <div className="text-xs text-text-muted">No issues detected</div>
                ) : (
                  filteredAnomalies.slice(0, 10).map((anomaly, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`px-3 py-2 rounded text-xs border-l-2 ${
                        anomaly.severity === "critical"
                          ? "bg-red-900/10 border-l-accent-red"
                          : "bg-amber-900/10 border-l-accent-amber"
                      }`}
                    >
                      <div className="font-mono font-600">
                        {anomaly.pod_name}
                      </div>
                      <div className="text-text-muted text-xs mt-1">
                        {anomaly.description.substring(0, 50)}...
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Recommendations */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-elevated border-subtle rounded-lg p-6 flex flex-col"
            >
              <h3 className="text-xs font-mono font-600 text-text-secondary mb-3 uppercase">
                Recommendations
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                {recommendations.length === 0 ? (
                  <div className="text-xs text-text-muted">No actions needed</div>
                ) : (
                  recommendations.slice(0, 10).map((rec, idx) => (
                    <motion.div
                      key={rec.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`px-3 py-2 rounded text-xs border-l-2 ${
                        rec.priority === "critical"
                          ? "bg-red-900/10 border-l-accent-red"
                          : rec.priority === "warning"
                            ? "bg-amber-900/10 border-l-accent-amber"
                            : "bg-blue-900/10 border-l-accent-cyan"
                      }`}
                    >
                      <div className="font-mono font-600">{rec.action}</div>
                      <div className="text-text-muted text-xs mt-1">
                        {rec.explanation.substring(0, 50)}...
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Agent Summary */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-elevated border-subtle rounded-lg p-6 lg:col-span-3"
            >
              <h3 className="text-xs font-mono font-600 text-text-secondary mb-4 uppercase">
                Agent Status Summary
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {agentStatuses.map((agent) => (
                  <div key={agent.name} className="text-center">
                    <div className="text-xs font-mono font-600 text-text-secondary">
                      {agent.name.split(" ")[0]}
                    </div>
                    <div className="text-sm font-bold text-accent-cyan mt-2">
                      {agent.findings_count || 0}
                    </div>
                    <div className="text-xs text-text-muted mt-1 capitalize">
                      {agent.status}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
