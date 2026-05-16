import React, { useState, useEffect } from "react";
import axios from "axios";
import { Flame, Cpu, HardDrive, RefreshCw, AlertOctagon } from "lucide-react";
import { motion } from "framer-motion";

export function HotspotsPanel() {
  const [hotspots, setHotspots] = useState({ cpu: [], memory: [], restarts: [], error_rate: [] });
  const [loading, setLoading] = useState(true);

  const fetchHotspots = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/hotspots/top");
      setHotspots(res.data);
    } catch (e) {
      console.error("Error fetching hotspots", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspots();
    const int = setInterval(fetchHotspots, 10000);
    return () => clearInterval(int);
  }, []);

  if (loading) {
    return <div className="h-60 bg-surface border border-subtle rounded-xl animate-pulse shadow-sm"></div>;
  }

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[320px] text-primary font-sans">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-subtle">
        <div className="flex items-center gap-2.5">
          <Flame size={18} className="text-accent-red animate-pulse" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            Cluster Hotspots (Top N Problem Pods)
          </h3>
        </div>
        <button onClick={fetchHotspots} className="p-1.5 text-muted hover:text-accent-cyan transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 flex-1 overflow-hidden">
        {/* CPU */}
        <div className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-subtle text-xs font-bold text-primary font-mono">
            <Cpu size={16} className="text-accent-red" /> CPU Saturation
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin text-xs font-mono">
            {hotspots.cpu?.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-surface px-2.5 py-2 rounded-lg border border-subtle shadow-2xs">
                <span className="truncate text-primary font-semibold">{item.pod_name.split('-').slice(-2).join('-')}</span>
                <span className="px-2 py-0.5 bg-accent-red/10 text-accent-red font-bold rounded-md border border-accent-red/20 text-[10px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Memory */}
        <div className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-subtle text-xs font-bold text-primary font-mono">
            <HardDrive size={16} className="text-accent-amber" /> Memory Working Set
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin text-xs font-mono">
            {hotspots.memory?.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-surface px-2.5 py-2 rounded-lg border border-subtle shadow-2xs">
                <span className="truncate text-primary font-semibold">{item.pod_name.split('-').slice(-2).join('-')}</span>
                <span className="px-2 py-0.5 bg-accent-amber/10 text-accent-amber font-bold rounded-md border border-accent-amber/20 text-[10px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Restarts */}
        <div className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-subtle text-xs font-bold text-primary font-mono">
            <RefreshCw size={16} className="text-accent-violet" /> Container Restarts
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin text-xs font-mono">
            {hotspots.restarts?.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-surface px-2.5 py-2 rounded-lg border border-subtle shadow-2xs">
                <span className="truncate text-primary font-semibold">{item.pod_name.split('-').slice(-2).join('-')}</span>
                <span className="px-2 py-0.5 bg-accent-violet/10 text-accent-violet font-bold rounded-md border border-accent-violet/20 text-[10px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Rate */}
        <div className="bg-elevated border border-subtle rounded-xl p-4 flex flex-col shadow-xs">
          <div className="flex items-center gap-2.5 pb-2.5 mb-3 border-b border-subtle text-xs font-bold text-primary font-mono">
            <AlertOctagon size={16} className="text-accent-cyan" /> Log Error Spikes
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin text-xs font-mono">
            {hotspots.error_rate?.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-surface px-2.5 py-2 rounded-lg border border-subtle shadow-2xs">
                <span className="truncate text-primary font-semibold">{item.pod_name.split('-').slice(-2).join('-')}</span>
                <span className="px-2 py-0.5 bg-accent-cyan/10 text-accent-cyan font-bold rounded-md border border-accent-cyan/20 text-[10px]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
