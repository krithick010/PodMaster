import React, { useState, useEffect } from "react";
import axios from "axios";
import { Terminal, Cpu, FileCode2, RefreshCw, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export function LogMetricsCorrelation() {
  const [data, setData] = useState(null);
  const [service, setService] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchCorrelation = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/correlation/logs-metrics?service=${service}`);
      setData(res.data);
    } catch (e) {
      console.error("Error fetching logs-metrics correlation", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrelation();
    const int = setInterval(fetchCorrelation, 10000);
    return () => clearInterval(int);
  }, [service]);

  if (loading || !data) {
    return <div className="h-60 bg-surface border border-subtle rounded-xl animate-pulse shadow-sm"></div>;
  }

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[360px] text-primary font-sans">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle">
        <div className="flex items-center gap-2.5">
          <Terminal size={18} className="text-accent-cyan" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            Logs + Metrics Correlation View
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="bg-elevated border border-subtle rounded-lg text-xs font-mono px-3 py-1.5 text-primary focus:outline-none focus:border-accent-cyan shadow-2xs"
          >
            <option value="all">All Services</option>
            <option value="student-portal">student-portal</option>
            <option value="attendance-service">attendance-service</option>
            <option value="result-service">result-service</option>
          </select>
          <button onClick={fetchCorrelation} className="p-1.5 text-muted hover:text-accent-cyan transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 overflow-hidden">
        {/* Metric Snapshots */}
        <div className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-subtle text-xs font-bold text-primary font-mono">
            <Cpu size={16} className="text-accent-violet" /> Resource Saturation Spikes
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
            {data.metrics_snapshot?.cpu?.map((item, idx) => (
              <div key={idx} className="bg-surface p-2.5 rounded-lg border border-subtle flex items-center justify-between text-xs font-mono shadow-2xs">
                <span className="text-primary truncate font-semibold">{item.pod_name}</span>
                <span className="px-2 py-0.5 bg-accent-red/10 border border-accent-red/20 text-accent-red font-bold rounded-md text-[10px]">
                  {item.value} CPU
                </span>
              </div>
            )) || <p className="text-xs font-mono text-muted">No recent metric spikes.</p>}
          </div>
        </div>

        {/* Log Snippets */}
        <div className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-subtle text-xs font-bold text-primary font-mono">
            <FileCode2 size={16} className="text-accent-amber" /> Correlated Log Indicators
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin font-mono text-xs">
            {data.log_snippets?.map((log, idx) => (
              <div key={idx} className="bg-surface p-3 rounded-lg border border-subtle space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-accent-cyan font-bold">{log.service}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.level === 'ERROR' ? 'bg-accent-red/10 text-accent-red border border-accent-red/20' : 'bg-accent-amber/10 text-accent-amber border border-accent-amber/20'}`}>
                    {log.level}
                  </span>
                </div>
                <p className="text-secondary text-xs leading-relaxed break-all font-sans">{log.message}</p>
              </div>
            )) || <p className="text-xs font-mono text-muted">No correlated log streams.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
