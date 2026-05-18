import React, { useState, useEffect } from "react";
import axios from "axios";
import { Bell, Plus, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AlertRulesPanel() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New rule form
  const [ruleName, setRuleName] = useState("");
  const [service, setService] = useState("all");
  const [metric, setMetric] = useState("cpu");
  const [operator, setOperator] = useState(">");
  const [threshold, setThreshold] = useState("80");
  const [duration, setDuration] = useState("5m");

  const fetchAlerts = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/alerts/active");
      setAlerts(res.data.alerts || []);
    } catch (e) {
      console.error("Error fetching alerts", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const int = setInterval(fetchAlerts, 10000);
    return () => clearInterval(int);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!ruleName) return;

    const conditionJson = JSON.stringify({
      metric,
      operator,
      value: Number(threshold),
      duration
    });

    try {
      await axios.post("http://localhost:8000/api/alerts", {
        name: ruleName,
        service,
        condition_json: conditionJson
      });
      setShowModal(false);
      setRuleName("");
      fetchAlerts();
    } catch (e) {
      console.error("Error creating alert", e);
    }
  };

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm relative flex flex-col h-full min-h-[360px] text-primary font-sans">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle">
        <div className="flex items-center gap-2.5">
          <Bell size={18} className="text-accent-amber" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider font-sans">
            Alert Rules & Automation Hooks
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-amber/10 text-accent-amber border border-accent-amber/20 rounded-lg font-mono text-xs font-bold hover:bg-accent-amber/20 transition-colors shadow-2xs"
          >
            <Plus size={14} /> New Rule
          </button>
          <button onClick={fetchAlerts} className="p-1.5 text-muted hover:text-accent-cyan transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted font-mono text-xs">
            <Bell size={32} className="text-accent-amber opacity-40" />
            <p className="font-sans">No active alert rules configured.</p>
          </div>
        ) : (
          alerts.map((alert) => {
            const isTriggered = alert.status === "triggered";
            let parsed = {};
            try { parsed = JSON.parse(alert.condition_json); } catch (e) {}
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${
                  isTriggered ? 'bg-accent-red/10 border-accent-red/30' : 'bg-elevated border-subtle'
                } flex items-center justify-between shadow-xs transition-all`}
              >
                <div className="flex items-center gap-3.5">
                  {isTriggered ? (
                    <AlertCircle size={20} className="text-accent-red shrink-0" />
                  ) : (
                    <CheckCircle2 size={20} className="text-accent-emerald shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-primary font-sans">{alert.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-surface border border-subtle rounded-md text-muted uppercase font-semibold">
                        {alert.service}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-muted mt-1.5 font-medium font-sans">
                      Condition: <span className="text-accent-cyan font-mono font-bold">{parsed.metric}</span> {parsed.operator} <span className="text-accent-amber font-mono font-bold">{parsed.value}%</span> for {parsed.duration}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold shadow-2xs ${
                    isTriggered ? 'bg-accent-red/10 text-accent-red border border-accent-red/20 animate-pulse' : 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20'
                  }`}>
                    {alert.status}
                  </span>
                  {alert.last_triggered_at && (
                    <div className="text-[10px] font-mono text-muted mt-1.5 font-medium">
                      Last: {new Date(alert.last_triggered_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-subtle rounded-2xl w-full max-w-md p-6 shadow-xl relative text-primary font-sans"
            >
              <h2 className="text-sm font-bold text-primary mb-4 pb-3 border-b border-subtle font-sans">
                Configure Alert Rule
              </h2>

              <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs font-sans font-medium">
                <div>
                  <label className="block text-muted mb-1.5 font-sans font-semibold">Rule Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., High CPU Saturation"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full bg-elevated border border-subtle rounded-lg px-3.5 py-2.5 text-primary placeholder-muted focus:outline-none focus:border-accent-cyan font-sans shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-muted mb-1.5 font-sans font-semibold">Target Service</label>
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full bg-elevated border border-subtle rounded-lg px-3 py-2.5 text-primary focus:outline-none focus:border-accent-cyan font-mono shadow-2xs"
                  >
                    <option value="all">All Services (Cluster-Wide)</option>
                    <option value="student-portal">student-portal</option>
                    <option value="attendance-service">attendance-service</option>
                    <option value="result-service">result-service</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div>
                    <label className="block text-muted mb-1.5 font-sans font-semibold">Metric</label>
                    <select
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                      className="w-full bg-elevated border border-subtle rounded-lg px-2.5 py-2.5 text-primary shadow-2xs"
                    >
                      <option value="cpu">CPU %</option>
                      <option value="memory">Memory %</option>
                      <option value="error_rate">Error Rate %</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted mb-1.5 font-sans font-semibold">Operator</label>
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value)}
                      className="w-full bg-elevated border border-subtle rounded-lg px-2.5 py-2.5 text-primary shadow-2xs"
                    >
                      <option value=">">&gt; greater than</option>
                      <option value="<">&lt; less than</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-muted mb-1.5 font-sans font-semibold">Threshold</label>
                    <input
                      type="number"
                      required
                      value={threshold}
                      onChange={(e) => setThreshold(e.target.value)}
                      className="w-full bg-elevated border border-subtle rounded-lg px-2.5 py-2.5 text-primary shadow-inner font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-5 border-t border-subtle mt-6 font-sans">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-elevated hover:bg-elevated/80 border border-subtle text-muted hover:text-primary rounded-lg font-bold transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-accent-amber hover:bg-accent-amber/90 text-white rounded-lg font-bold transition-colors shadow-xs font-sans"
                  >
                    Save Rule
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
