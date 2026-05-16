import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { GitCommitVertical, ShieldAlert, AlertTriangle, Info, Sparkles, FileText, Settings, X, RefreshCw, Layers } from "lucide-react";

export function AnomalyTimeline({ anomalies = [] }) {
  const [activeTab, setActiveTab] = useState("anomalies"); // anomalies | rcas | config
  const [rcaList, setRcaList] = useState([]);
  const [configList, setConfigList] = useState([]);
  const [selectedRca, setSelectedRca] = useState(null);
  const [generatingRca, setGeneratingRca] = useState(false);
  const [rcaReport, setRcaReport] = useState(null);

  const fetchRcasAndConfig = async () => {
    try {
      const [rcaRes, cfgRes] = await Promise.all([
        axios.get("http://localhost:8000/api/rca/recent"),
        axios.get("http://localhost:8000/api/events/config")
      ]);
      setRcaList(rcaRes.data.rcas || []);
      setConfigList(cfgRes.data.events || []);
    } catch (e) {
      console.error("Error fetching RCA/Config data", e);
    }
  };

  useEffect(() => {
    fetchRcasAndConfig();
    const interval = setInterval(fetchRcasAndConfig, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateReport = async (rca) => {
    setSelectedRca(rca);
    setGeneratingRca(true);
    setRcaReport(null);
    try {
      const res = await axios.post("http://localhost:8000/api/rca/generate", { rca_id: rca.id });
      setRcaReport(res.data.report_markdown);
    } catch (e) {
      console.error("RCA generation error", e);
      setRcaReport("### 🚨 RCA Report Error\nUnable to generate full RCA report at this time. Please check AI subsystem connectivity.");
    } finally {
      setGeneratingRca(false);
    }
  };

  const sortedAnomalies = [...anomalies]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 25);

  const getSeverity = (severity) => {
    switch (severity) {
      case "critical":
        return {
          icon: <ShieldAlert size={14} className="text-accent-red shrink-0" />,
          dot: "bg-accent-red shadow-2xs",
          border: "border-accent-red/30",
          bg: "bg-accent-red/5",
          label: "bg-accent-red/10 text-accent-red border border-accent-red/20",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={14} className="text-accent-amber shrink-0" />,
          dot: "bg-accent-amber shadow-2xs",
          border: "border-accent-amber/30",
          bg: "bg-accent-amber/5",
          label: "bg-accent-amber/10 text-accent-amber border border-accent-amber/20",
        };
      default:
        return {
          icon: <Info size={14} className="text-accent-cyan shrink-0" />,
          dot: "bg-accent-cyan shadow-2xs",
          border: "border-accent-cyan/20",
          bg: "bg-accent-cyan/5",
          label: "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20",
        };
    }
  };

  return (
    <div className="bg-surface border border-subtle rounded-xl overflow-hidden shadow-sm relative flex flex-col h-full min-h-[400px] text-primary font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-elevated/60">
        <div className="flex items-center gap-2.5 font-sans">
          <GitCommitVertical size={18} className="text-accent-violet" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider font-sans">
            Timeline & Incident Log
          </h3>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-surface p-1.5 rounded-lg border border-subtle shadow-2xs font-mono">
          <button
            onClick={() => setActiveTab("anomalies")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase font-bold transition-all ${
              activeTab === "anomalies" ? "bg-accent-violet/10 text-accent-violet border border-accent-violet/20 shadow-2xs" : "text-muted hover:text-primary"
            }`}
          >
            Anomalies ({sortedAnomalies.length})
          </button>
          <button
            onClick={() => setActiveTab("rcas")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase font-bold transition-all ${
              activeTab === "rcas" ? "bg-accent-red/10 text-accent-red border border-accent-red/20 shadow-2xs" : "text-muted hover:text-primary"
            }`}
          >
            RCA Incidents ({rcaList.length})
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase font-bold transition-all ${
              activeTab === "config" ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 shadow-2xs" : "text-muted hover:text-primary"
            }`}
          >
            Config Events ({configList.length})
          </button>
        </div>
      </div>

      {/* Timeline Body */}
      <div className="p-6 flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === "anomalies" && (
          sortedAnomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted font-sans font-medium">
              <ShieldAlert size={32} className="text-accent-emerald opacity-50" />
              <p className="text-sm font-semibold text-accent-emerald font-sans">All systems nominal — no anomalies detected</p>
            </div>
          ) : (
            <div className="relative font-sans">
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-subtle" />
              <AnimatePresence>
                <div className="space-y-4 font-sans font-medium">
                  {sortedAnomalies.map((anomaly, idx) => {
                    const s = getSeverity(anomaly.severity);
                    return (
                      <motion.div
                        key={`${anomaly.timestamp}-${idx}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3.5 group"
                      >
                        <div className="relative z-10 mt-2 shrink-0">
                          <div className={`w-3 h-3 rounded-full ${s.dot} ring-4 ring-surface`} />
                        </div>
                        <div className={`flex-1 rounded-xl border ${s.border} ${s.bg} px-4 py-3.5 transition-all hover:bg-elevated/40 shadow-2xs`}>
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {s.icon}
                              <span className="text-xs font-bold text-primary font-sans truncate font-semibold">
                                {anomaly.pod_name}
                              </span>
                              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${s.label} uppercase font-bold shrink-0 shadow-2xs`}>
                                {anomaly.severity}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-muted shrink-0">
                              {new Date(anomaly.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                            </span>
                          </div>
                          <p className="text-xs text-secondary font-sans leading-relaxed">
                            {anomaly.description}
                          </p>
                          {anomaly.llm_insight && (
                            <div className="mt-3 flex items-start gap-2 pt-2.5 border-t border-subtle font-sans">
                              <Sparkles size={14} className="text-accent-violet mt-0.5 shrink-0" />
                              <p className="text-xs text-secondary font-sans leading-relaxed bg-surface/50 p-2.5 rounded-lg border border-subtle font-normal w-full">
                                {anomaly.llm_insight}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </div>
          )
        )}

        {/* RCA Incidents Tab */}
        {activeTab === "rcas" && (
          rcaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted font-sans font-medium">
              <Layers size={32} className="text-accent-violet opacity-50" />
              <p className="font-sans">No active RCA incident clusters detected.</p>
            </div>
          ) : (
            <div className="space-y-4 font-sans font-medium">
              {rcaList.map((rca) => (
                <div key={rca.id} className="bg-elevated border border-accent-red/30 rounded-xl p-5 relative overflow-hidden shadow-xs">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-red via-accent-amber to-transparent"></div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 bg-accent-red/10 text-accent-red border border-accent-red/20 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider shadow-2xs">
                        {rca.id}
                      </span>
                      <span className="text-xs font-bold text-primary font-sans">{rca.primary_service}</span>
                    </div>
                    <span className="text-xs font-mono text-muted">{new Date(rca.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-xs font-sans text-secondary mb-4 space-y-1.5 leading-relaxed">
                    <p><strong className="text-primary font-bold">Symptoms:</strong> {rca.symptoms}</p>
                    <p><strong className="text-primary font-bold">Suspected Cause:</strong> {rca.suspected_root_cause}</p>
                  </div>
                  <div className="flex justify-end pt-3 border-t border-subtle">
                    <button
                      onClick={() => handleGenerateReport(rca)}
                      className="flex items-center gap-2 px-4 py-2 bg-accent-violet hover:bg-accent-violet/90 text-white font-sans font-semibold text-xs rounded-lg transition-colors shadow-xs"
                    >
                      <Sparkles size={14} /> Generate Deep-Dive AI RCA Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Config Events Tab */}
        {activeTab === "config" && (
          configList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted font-sans font-medium">
              <Settings size={32} className="text-accent-cyan opacity-50" />
              <p className="font-sans">No recent configuration or deployment events.</p>
            </div>
          ) : (
            <div className="relative font-sans font-medium">
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-accent-cyan/30" />
              <div className="space-y-4">
                {configList.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-3.5">
                    <div className="relative z-10 mt-2 shrink-0">
                      <div className="w-3 h-3 rounded-full bg-accent-cyan ring-4 ring-surface shadow-2xs" />
                    </div>
                    <div className="flex-1 bg-elevated border border-accent-cyan/20 rounded-xl p-4 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 bg-accent-cyan/10 text-accent-cyan font-mono text-[10px] uppercase font-bold rounded-md border border-accent-cyan/20 shadow-2xs">
                            {evt.event_type}
                          </span>
                          <span className="text-xs font-bold text-primary font-sans">{evt.service}</span>
                        </div>
                        <span className="text-xs font-mono text-muted">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs font-sans text-secondary leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      {/* AI RCA Modal */}
      <AnimatePresence>
        {selectedRca && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-subtle rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden relative text-primary font-sans"
            >
              <div className="p-5 border-b border-subtle flex items-center justify-between bg-elevated font-sans">
                <div className="flex items-center gap-2.5">
                  <FileText className="text-accent-violet" size={20} />
                  <h2 className="text-sm font-bold text-primary font-sans">
                    AI Root Cause Analysis Report — {selectedRca.primary_service}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedRca(null)}
                  className="p-2 rounded-lg hover:bg-surface text-muted hover:text-primary transition-colors border border-transparent hover:border-subtle shadow-2xs"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-8 flex-1 overflow-y-auto font-sans text-secondary leading-relaxed scrollbar-thin">
                {generatingRca ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <div className="w-12 h-12 border-3 border-accent-violet border-t-transparent rounded-full animate-spin shadow-2xs"></div>
                    <p className="font-sans text-xs text-accent-violet animate-pulse uppercase tracking-wider font-bold">
                      Synthesizing BPF & Telemetry Traces...
                    </p>
                    <p className="text-xs text-muted max-w-md font-sans">
                      PodMaster AI is querying OpenRouter cluster intelligence across logs, resource exhaustion metrics, and dependency graphs.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-none text-xs sm:text-sm font-sans space-y-4">
                    {rcaReport ? (
                      <div className="whitespace-pre-wrap font-mono text-xs bg-elevated p-6 rounded-xl border border-subtle text-primary leading-relaxed shadow-inner">
                        {rcaReport}
                      </div>
                    ) : (
                      <p className="text-accent-red font-semibold">Error rendering report.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-subtle bg-elevated/60 flex justify-end font-sans">
                <button
                  onClick={() => setSelectedRca(null)}
                  className="px-5 py-2 bg-surface hover:bg-surface/80 text-muted hover:text-primary border border-subtle font-sans text-xs rounded-lg font-bold transition-colors shadow-2xs"
                >
                  Close RCA Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
