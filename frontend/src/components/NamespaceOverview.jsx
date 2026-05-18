import React, { useState, useEffect } from "react";
import axios from "axios";
import { FolderKanban, Activity, DollarSign, RefreshCw, Layers } from "lucide-react";
import { motion } from "framer-motion";

export function NamespaceOverview() {
  const [namespaces, setNamespaces] = useState([]);
  const [source, setSource] = useState("unavailable");
  const [loading, setLoading] = useState(true);

  const fetchNamespaces = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/namespaces/health");
      setNamespaces(res.data.namespaces || []);
      setSource(res.data.source || "unavailable");
    } catch (e) {
      console.error("Error fetching namespaces health", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNamespaces();
    const int = setInterval(fetchNamespaces, 15000);
    return () => clearInterval(int);
  }, []);

  if (loading) {
    return <div className="h-40 bg-surface border border-subtle rounded-xl animate-pulse shadow-sm"></div>;
  }

  const isLiveSource = source === "prometheus" || source === "kubernetes";

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm relative flex flex-col justify-between text-primary font-sans">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle">
        <div className="flex items-center gap-2.5">
          <FolderKanban size={18} className="text-accent-violet" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            Namespace Health & Cost Optimization Summary
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${isLiveSource ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20" : "bg-accent-amber/10 text-accent-amber border-accent-amber/20"}`}>
            {isLiveSource ? `${source} live` : "No live data"}
          </span>
          <button onClick={fetchNamespaces} className="p-1.5 text-muted hover:text-accent-cyan transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {namespaces.length === 0 && (
        <div className="min-h-[180px] flex items-center justify-center rounded-xl border border-dashed border-subtle bg-elevated/30 text-muted text-sm font-mono uppercase tracking-wider">
          Waiting for live namespace summaries from the cluster
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {namespaces.map((ns) => {
          const isHealthy = ns.health_score > 80;
          return (
            <motion.div
              key={ns.namespace}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col justify-between shadow-xs hover:border-accent-violet transition-all"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-subtle">
                <span className="text-xs font-bold font-mono text-primary truncate">{ns.namespace}</span>
                <div className="flex items-center gap-2">
                  {ns.source && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-elevated text-muted border-subtle">
                      {ns.source}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase shadow-2xs ${
                    isHealthy ? 'bg-accent-emerald/10 text-accent-emerald border border-accent-emerald/20' : 'bg-accent-red/10 text-accent-red border border-accent-red/20'
                  }`}>
                    {isHealthy ? 'Optimal' : 'Degraded'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 my-2 font-mono">
                <div className="bg-surface p-3 rounded-lg border border-subtle shadow-xs">
                  <div className="text-[11px] text-muted uppercase flex items-center gap-1.5 font-sans font-medium"><Activity size={12}/> Health</div>
                  <div className={`text-xl font-black mt-1 ${isHealthy ? 'text-accent-emerald' : 'text-accent-red'}`}>{ns.health_score.toFixed(1)}%</div>
                </div>
                <div className="bg-surface p-3 rounded-lg border border-subtle shadow-xs">
                  <div className="text-[11px] text-muted uppercase flex items-center gap-1.5 font-sans font-medium"><DollarSign size={12}/> Cost Score</div>
                  <div className="text-xl font-black text-accent-amber mt-1">{ns.cost_score.toFixed(1)}/100</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-muted pt-2 border-t border-subtle mt-1">
                <span>Pods: <strong className="text-primary">{ns.pods}</strong></span>
                <span>Restarts: <strong className="text-primary">{ns.restarts}</strong></span>
                <span>CPU: <strong className="text-primary">{ns.cpu_usage.toFixed(2)} cores</strong></span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
