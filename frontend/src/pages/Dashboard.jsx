import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";
import { GoldenSignalsBar } from "../components/GoldenSignalsBar";
import { LiveMetrics } from "../components/LiveMetrics";
import { PodNetworkGraph } from "../components/PodNetworkGraph";
import { LLMObservability } from "../components/LLMObservability";
import { AIInsights } from "../components/AIInsights";
import { HealthScore } from "../components/HealthScore";
import { PredictiveForecast } from "../components/PredictiveForecast";
import { ServiceCorrelations } from "../components/ServiceCorrelations";
import { AnomalyTimeline } from "../components/AnomalyTimeline";
import { ChaosControl } from "../components/ChaosControl";
import { LiveActivityFeed } from "../components/LiveActivityFeed";
import { AIRecommendations } from "../components/AIRecommendations";
import { AgentPipelineFlow } from "../components/AgentPipelineFlow";
import { AgentInsightCard } from "../components/AgentInsightCard";
import { PipelineAnalysisPanel } from "../components/PipelineAnalysisPanel";

import { useWebSocket } from "../hooks/useWebSocket";
import { useNamespaceContext } from "../context/NamespaceContext";

export function Dashboard() {
  const { metrics, anomalies, connectionStatus, pipelineAnalysis, pipelineLoading } = useWebSocket();
  const { namespaces, selectedNamespace } = useNamespaceContext();

  const [selectedPod, setSelectedPod] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filteredAnomalies = anomalies.filter((a) => {
    if (selectedNamespace !== "all" && a.namespace !== selectedNamespace) return false;
    if (selectedPod !== "all" && a.pod_name !== selectedPod) return false;
    return true;
  });

  const criticalCount = anomalies.filter((a) => a.severity === "critical").length;
  const podCount = Object.values(metrics).reduce(
    (sum, ns) => sum + Object.keys(ns).length,
    0
  );

  return (
    <div className="flex flex-col h-screen w-full bg-base overflow-hidden">
      <Header
        podCount={podCount}
        criticalCount={criticalCount}
        connectionStatus={connectionStatus}
        namespaces={namespaces}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          metrics={metrics}
          anomalies={anomalies}
          selectedPod={selectedPod}
          setSelectedPod={setSelectedPod}
        />

        {/* Main scrollable area */}
        <main className="flex-1 overflow-y-auto bg-base">
          <div className="p-4 md:p-5 space-y-5 pb-12 max-w-[1800px] mx-auto">

            {/* ROW 1: Golden Signals KPI Strip */}
            <GoldenSignalsBar />

            {/* ROW 1b: Live Metrics Time-Series */}
            <div className="min-h-[320px]">
              <LiveMetrics anomalies={filteredAnomalies} selectedPod={selectedPod} />
            </div>

            {/* ROW 2: Topology Graph + Right Stack */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              <div className="xl:col-span-8" style={{ minHeight: 520 }}>
                <PodNetworkGraph metrics={metrics} anomalies={anomalies} />
              </div>
              <div
                className="xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1"
                style={{ height: 520 }}
              >
                <div className="flex-shrink-0">
                  <HealthScore />
                </div>
                <div className="flex-shrink-0">
                  <LLMObservability />
                </div>
                <div className="flex-1 min-h-[200px]">
                  <AIInsights namespace={selectedNamespace} />
                </div>
              </div>
            </div>

            {/* ROW 3: Forecast + Correlations */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-7" style={{ height: 340 }}>
                <PredictiveForecast
                  podName={selectedPod !== "all" ? selectedPod : "result-service-0"}
                />
              </div>
              <div className="xl:col-span-5" style={{ height: 340 }}>
                <ServiceCorrelations />
              </div>
            </div>

            {/* ROW 4: Anomaly Timeline — fed from live WS anomalies */}
            <AnomalyTimeline anomalies={filteredAnomalies} />

            {/* ROW 5: Chaos Control + Activity Feed */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              <div className="xl:col-span-7 min-h-[420px]">
                <ChaosControl />
              </div>
              <div className="xl:col-span-5 min-h-[420px]">
                <LiveActivityFeed />
              </div>
            </div>

            {/* ROW 6: AI Recommendations */}
            <AIRecommendations />

            {/* ROW 7: Multi-Agent Pipeline Flow */}
            <AgentPipelineFlow
              pipelineAnalysis={pipelineAnalysis}
              pipelineLoading={pipelineLoading}
            />

            {/* ROW 8: Per-Agent Insight Cards */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {["cpu", "memory", "network", "storage", "logio", "scheduling"].map((domain, i) => (
                <AgentInsightCard
                  key={domain}
                  domain={domain}
                  data={pipelineAnalysis?.agents?.[domain]}
                  isLoading={pipelineLoading}
                  index={i}
                />
              ))}
            </div>

            {/* ROW 9: Coordinator Final Analysis */}
            <PipelineAnalysisPanel
              analysis={pipelineAnalysis?.coordinator}
              isLoading={pipelineLoading}
            />

          </div>
        </main>
      </div>
    </div>
  );
}
