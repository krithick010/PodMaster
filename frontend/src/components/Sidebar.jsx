import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Box, Search, Folder, CircleAlert, CircleCheck, CircleMinus } from "lucide-react";

export function Sidebar({ isOpen, setIsOpen, metrics, anomalies, selectedPod, setSelectedPod }) {
  
  // Calculate cluster tree
  const tree = useMemo(() => {
    const namespaces = {};
    
    // Process metrics
    Object.entries(metrics).forEach(([ns, pods]) => {
      if (!namespaces[ns]) namespaces[ns] = { pods: [], status: 'healthy' };
      
      Object.entries(pods).forEach(([podName, podMetrics]) => {
        // Determine status
        let status = 'healthy';
        const podAnomalies = anomalies.filter(a => a.pod_name === podName);
        
        const hasCritical = podAnomalies.some(a => a.severity === 'critical') || 
                            podMetrics.cpu_usage / podMetrics.cpu_limit > 0.8 ||
                            podMetrics.restart_count > 1;
                            
        const hasWarning = podAnomalies.some(a => a.severity === 'warning') ||
                           podMetrics.cpu_usage / podMetrics.cpu_limit > 0.6 ||
                           podMetrics.memory_usage / podMetrics.memory_limit > 0.85;
                           
        if (hasCritical) status = 'critical';
        else if (hasWarning) status = 'warning';
        
        if (status === 'critical') namespaces[ns].status = 'critical';
        else if (status === 'warning' && namespaces[ns].status !== 'critical') namespaces[ns].status = 'warning';

        namespaces[ns].pods.push({ name: podName, status });
      });
    });

    return namespaces;
  }, [metrics, anomalies]);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'critical': return <CircleAlert size={12} className="text-accent-red" />;
      case 'warning': return <CircleMinus size={12} className="text-accent-amber" />;
      default: return <CircleCheck size={12} className="text-accent-emerald" />;
    }
  };

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? 260 : 0 }}
      className="h-full bg-surface border-r border-subtle flex flex-col z-20 shrink-0 relative overflow-visible"
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-6 w-6 h-6 bg-bg-elevated border border-subtle rounded-full flex items-center justify-center text-text-muted hover:text-accent-cyan hover:border-accent-cyan transition-colors z-30 shadow-md"
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full overflow-hidden w-[260px]"
          >
            <div className="p-4 border-b border-subtle">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  placeholder="Filter pods..."
                  className="w-full bg-bg-elevated border border-subtle rounded text-xs py-1.5 pl-8 pr-3 text-text-primary focus:outline-none focus:border-accent-cyan transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
              
              <button 
                onClick={() => setSelectedPod("all")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-mono transition-colors ${selectedPod === "all" ? "bg-accent-cyan/10 text-accent-cyan" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"}`}
              >
                <Box size={16} /> All Pods
              </button>

              <div className="mt-4">
                <div className="px-3 text-[10px] font-mono font-bold text-text-muted uppercase tracking-wider mb-2">Cluster Tree</div>
                
                {Object.entries(tree).map(([ns, nsData]) => (
                  <div key={ns} className="mb-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-text-primary font-bold">
                      <Folder size={14} className="text-accent-violet" />
                      {ns}
                    </div>
                    <div className="ml-5 border-l border-subtle pl-2 space-y-1 mt-1">
                      {nsData.pods.map(pod => (
                        <button
                          key={pod.name}
                          onClick={() => setSelectedPod(pod.name)}
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono text-left transition-colors ${selectedPod === pod.name ? "bg-accent-cyan/10 text-accent-cyan" : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"}`}
                        >
                          <span className="truncate pr-2">{pod.name.split('-').slice(0, 2).join('-')}</span>
                          <span className="shrink-0">{getStatusIcon(pod.status)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-t border-subtle bg-bg-elevated/50 text-[10px] text-text-muted font-mono flex flex-col gap-1">
              <div className="flex items-center justify-between"><span>Healthy</span> <CircleCheck size={10} className="text-accent-emerald"/></div>
              <div className="flex items-center justify-between"><span>Warning</span> <CircleMinus size={10} className="text-accent-amber"/></div>
              <div className="flex items-center justify-between"><span>Critical</span> <CircleAlert size={10} className="text-accent-red"/></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
