import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Globe, Sparkles, Bell, Flame } from "lucide-react";
import { Header } from "../components/Header";
import { AlertNotificationStrip } from "../components/AlertNotificationStrip";
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

// New SRE Features Components
import { SLOStatusBar } from "../components/SLOStatusBar";
import { AlertRulesPanel } from "../components/AlertRulesPanel";
import { LogMetricsCorrelation } from "../components/LogMetricsCorrelation";
import { HotspotsPanel } from "../components/HotspotsPanel";
import { AIQueryBar } from "../components/AIQueryBar";
import { NamespaceOverview } from "../components/NamespaceOverview";
import { MultiAgentSubsystem } from "../components/MultiAgentSubsystem";

import { useWebSocket } from "../hooks/useWebSocket";
import { useNamespaceContext } from "../context/NamespaceContext";

export function Dashboard() {
  const { metrics, anomalies, connectionStatus } = useWebSocket();
  const { namespaces, selectedNamespace } = useNamespaceContext();

  const [selectedPod, setSelectedPod] = useState("all");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("overview");

  useEffect(() => {
    const handleReset = () => {
      setCurrentView("overview");
      setSelectedPod("all");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("resetDashboardView", handleReset);
    return () => window.removeEventListener("resetDashboardView", handleReset);
  }, []);

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

  const views = [
    { id: "overview", label: "Overview & Signals", icon: <LayoutDashboard size={16} /> },
    { id: "topology", label: "Topology & Hotspots", icon: <Globe size={16} /> },
    { id: "ai", label: "AI & Correlations", icon: <Sparkles size={16} /> },
    { id: "alerts", label: "Alerts & Timeline", icon: <Bell size={16} /> },
    { id: "chaos", label: "Chaos Sandbox", icon: <Flame size={16} /> },
  ];

  return (
    <div className="flex flex-col h-screen w-full bg-base text-primary overflow-hidden font-sans select-none">
      <AlertNotificationStrip />
      <Header
        podCount={podCount}
        criticalCount={criticalCount}
        connectionStatus={connectionStatus}
        namespaces={namespaces}
      />

      {/* Tab Navigation Sub-Bar */}
      <div className="bg-surface border-b border-subtle px-6 flex items-center gap-2 overflow-x-auto shrink-0 shadow-xs z-10 scrollbar-none">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setCurrentView(v.id)}
            className={`flex items-center gap-2 px-4 py-3.5 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
              currentView === v.id
                ? "border-accent-violet text-accent-violet bg-accent-violet/5"
                : "border-transparent text-muted hover:text-primary hover:bg-elevated/50"
            }`}
          >
            {v.icon}
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          metrics={metrics}
          anomalies={anomalies}
          selectedPod={selectedPod}
          setSelectedPod={setSelectedPod}
        />

        <main className="flex-1 overflow-y-auto bg-base p-6 pb-24 max-w-[1900px] mx-auto w-full scrollbar-thin">
          <AnimatePresence mode="wait">
            {/* VIEW 1: Overview & Golden Signals */}
            {currentView === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }} className="space-y-6">
                <AIQueryBar />
                <GoldenSignalsBar />
                <SLOStatusBar />
                <NamespaceOverview />
              </motion.div>
            )}

            {/* VIEW 2: Topology & Cluster Hotspots */}
            {currentView === "topology" && (
              <motion.div key="topology" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }} className="space-y-6 font-sans">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <div className="xl:col-span-9 flex flex-col h-full min-h-[580px]">
                    <PodNetworkGraph />
                  </div>
                  <div className="xl:col-span-3 flex flex-col gap-6">
                    <HealthScore />
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                  <div className="xl:col-span-12 flex flex-col">
                    <HotspotsPanel />
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                  <div className="xl:col-span-12 flex flex-col">
                    <LiveMetrics anomalies={filteredAnomalies} selectedPod={selectedPod} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: AI SRE & Correlations */}
            {currentView === "ai" && (
              <motion.div key="ai" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }} className="space-y-6 font-sans">
                <MultiAgentSubsystem />
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  <div className="xl:col-span-8 flex flex-col min-h-[300px]">
                    <AIInsights namespace={selectedNamespace} />
                  </div>
                  <div className="xl:col-span-4 flex flex-col">
                    <LLMObservability />
                  </div>
                </div>
                <LogMetricsCorrelation />
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                  <div className="xl:col-span-7 flex flex-col min-h-[380px]">
                    <PredictiveForecast podName={selectedPod !== "all" ? selectedPod : "result-service-0"} />
                  </div>
                  <div className="xl:col-span-5 flex flex-col min-h-[380px]">
                    <ServiceCorrelations />
                  </div>
                </div>
                <AIRecommendations />
              </motion.div>
            )}

            {/* VIEW 4: Alerts & Activity Stream */}
            {currentView === "alerts" && (
              <motion.div key="alerts" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }} className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                  <div className="xl:col-span-7 flex flex-col min-h-[440px]">
                    <AnomalyTimeline anomalies={filteredAnomalies} />
                  </div>
                  <div className="xl:col-span-5 flex flex-col min-h-[440px]">
                    <AlertRulesPanel />
                  </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                  <div className="xl:col-span-12 flex flex-col min-h-[400px]">
                    <LiveActivityFeed />
                  </div>
                </div>
              </motion.div>
            )}

            {/* VIEW 5: Chaos Sandbox */}
            {currentView === "chaos" && (
              <motion.div key="chaos" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2 }} className="space-y-6">
                <ChaosControl />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
