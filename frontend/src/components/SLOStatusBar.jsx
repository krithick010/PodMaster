import React, { useState, useEffect } from "react";
import axios from "axios";
import { ShieldCheck, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export function SLOStatusBar() {
  const [slos, setSlos] = useState([]);
  const [source, setSource] = useState("unavailable");
  const [loading, setLoading] = useState(true);

  const fetchSlos = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/slo/status");
      setSlos(res.data.slos || []);
      setSource(res.data.source || "unavailable");
    } catch (e) {
      console.error("Error fetching SLOs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlos();
    const interval = setInterval(fetchSlos, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "breached":
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1"><XCircle size={10}/> Breached</span>;
      case "at_risk":
        return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1"><AlertTriangle size={10}/> At Risk</span>;
      default:
        return <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1"><ShieldCheck size={10}/> On Track</span>;
    }
  };

  if (loading) {
    return <div className="h-28 bg-surface border border-subtle rounded-xl animate-pulse shadow-sm"></div>;
  }

  const isLiveSource = source === "prometheus" || source === "kubernetes";

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between text-primary font-sans">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-subtle">
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-accent-emerald" />
          Service Level Objectives (SLOs) & Error Budgets
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${isLiveSource ? "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20" : "bg-accent-amber/10 text-accent-amber border-accent-amber/20"}`}>
            {isLiveSource ? `${source} live` : "No live data"}
          </span>
          <button onClick={fetchSlos} className="p-1.5 text-muted hover:text-accent-cyan transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {slos.length === 0 && (
        <div className="min-h-[160px] flex items-center justify-center rounded-xl border border-dashed border-subtle bg-elevated/30 text-muted text-sm font-mono uppercase tracking-wider">
          Waiting for live SLO records from the cluster
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {slos.map((slo) => {
          const isBreached = slo.status === "breached";
          return (
            <motion.div
              key={slo.id}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col justify-between hover:border-accent-violet transition-all shadow-xs relative"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono text-primary truncate">{slo.service}</span>
                <div className="flex items-center gap-2">
                  {slo.source && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border bg-elevated text-muted border-subtle">
                      {slo.source}
                    </span>
                  )}
                  {getStatusBadge(slo.status)}
                </div>
              </div>

              <div className="flex items-baseline justify-between my-3 font-mono">
                <div>
                  <span className="text-xs text-muted font-normal">Avail: </span>
                  <span className={`text-xl font-black ${isBreached ? 'text-accent-red' : 'text-primary'}`}>
                    {slo.current_availability.toFixed(2)}%
                  </span>
                </div>
                <div className="text-[11px] text-muted font-normal">
                  Target: {slo.objective_percentage}%
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono text-muted mb-1.5 font-medium">
                  <span>Error Budget Remaining</span>
                  <span>{slo.budget_remaining.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-surface border border-subtle h-2 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isBreached ? 'bg-accent-red' : slo.status === 'at_risk' ? 'bg-accent-amber' : 'bg-accent-emerald'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, slo.budget_remaining))}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
