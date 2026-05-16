import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Folder, Box, ChevronRight, ChevronDown, CircleDot, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function ClusterExplorer({ selectedPod, setSelectedPod, filterQuery = "" }) {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedNs, setExpandedNs] = useState({});
  const [expandedDep, setExpandedDep] = useState({});

  useEffect(() => {
    const fetchTree = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/cluster/tree");
        setTreeData(res.data.tree || []);
        
        // Auto-expand all namespaces on initial load
        if (res.data.tree && res.data.tree.length > 0) {
          const nsMap = {};
          const depMap = {};
          res.data.tree.forEach(ns => {
            nsMap[ns.namespace] = true;
            ns.deployments.forEach(dep => {
              depMap[dep.name] = true;
            });
          });
          setExpandedNs(prev => Object.keys(prev).length ? prev : nsMap);
          setExpandedDep(prev => Object.keys(prev).length ? prev : depMap);
        }
      } catch (e) {
        console.error("Error fetching cluster tree", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTree();
    const int = setInterval(fetchTree, 10000);
    return () => clearInterval(int);
  }, []);

  const filteredTree = useMemo(() => {
    if (!filterQuery) return treeData;
    const q = filterQuery.toLowerCase();
    
    return treeData.map(ns => {
      const isNsMatch = ns.namespace.toLowerCase().includes(q);
      const filteredDeps = ns.deployments.map(dep => {
        const isDepMatch = dep.name.toLowerCase().includes(q);
        const filteredPods = dep.pods.filter(pod => {
          if (q === "running") return pod.status === "Running" && pod.restarts === 0;
          if (q === "issues") return pod.status !== "Running" || pod.restarts > 0;
          return pod.name.toLowerCase().includes(q) || pod.status.toLowerCase().includes(q);
        });
        if (isNsMatch || isDepMatch || filteredPods.length > 0) {
          return {
            ...dep,
            pods: (isNsMatch || isDepMatch) && filteredPods.length === 0 ? dep.pods : filteredPods
          };
        }
        return null;
      }).filter(Boolean);

      if (isNsMatch || filteredDeps.length > 0) {
        return {
          ...ns,
          deployments: isNsMatch && filteredDeps.length === 0 ? ns.deployments : filteredDeps
        };
      }
      return null;
    }).filter(Boolean);
  }, [treeData, filterQuery]);

  const toggleNs = (ns) => setExpandedNs(p => ({ ...p, [ns]: !p[ns] }));
  const toggleDep = (dep) => setExpandedDep(p => ({ ...p, [dep]: !p[dep] }));

  const getStatusColor = (status, restarts) => {
    if (status === "CrashLoopBackOff" || restarts > 3) return "#ef4444"; // red
    if (status === "Warning" || restarts > 0) return "#f59e0b"; // amber
    return "#10b981"; // emerald
  };

  if (loading) {
    return (
      <div className="p-4 flex flex-col gap-3 animate-pulse">
        <div className="h-4 bg-surface rounded-md w-2/3 border border-subtle" />
        <div className="h-4 bg-surface rounded-md w-1/2 ml-4 border border-subtle" />
        <div className="h-4 bg-surface rounded-md w-1/3 ml-8 border border-subtle" />
      </div>
    );
  }

  return (
    <div className="flex flex-col text-xs font-mono text-primary select-none font-sans">
      <div className="px-4 py-3 flex items-center justify-between text-xs font-bold text-muted uppercase tracking-wider border-b border-subtle bg-elevated/40 font-sans">
        <span>Cluster Hierarchy</span>
        <RefreshCw size={14} className="hover:text-accent-cyan cursor-pointer transition-colors" />
      </div>

      <div className="p-3 space-y-1.5 font-mono">
        {filteredTree.map((nsItem) => {
          const isNsOpen = expandedNs[nsItem.namespace] !== false;
          return (
            <div key={nsItem.namespace} className="flex flex-col">
              <button
                onClick={() => toggleNs(nsItem.namespace)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-elevated text-primary font-bold w-full text-left transition-colors font-sans shadow-2xs"
              >
                {isNsOpen ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
                <Folder size={16} className="text-accent-violet shrink-0" />
                <span className="truncate">{nsItem.namespace}</span>
                <span className="ml-auto text-[10px] font-mono bg-surface border border-subtle px-2 py-0.5 rounded-md text-muted font-bold shadow-2xs">
                  {nsItem.deployments.length}
                </span>
              </button>

              <AnimatePresence>
                {isNsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-5 pl-3 border-l-2 border-subtle flex flex-col gap-1 my-1 overflow-hidden font-sans"
                  >
                    {nsItem.deployments.map((dep) => {
                      const isDepOpen = expandedDep[dep.name] !== false;
                      return (
                        <div key={dep.name} className="flex flex-col font-mono">
                          <button
                            onClick={() => toggleDep(dep.name)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-elevated text-secondary font-semibold w-full text-left transition-colors text-xs font-sans"
                          >
                            {isDepOpen ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
                            <Box size={14} className="text-accent-cyan shrink-0" />
                            <span className="truncate">{dep.name}</span>
                          </button>

                          <AnimatePresence>
                            {isDepOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="ml-4 pl-3 border-l border-subtle flex flex-col py-1 space-y-1 overflow-hidden font-mono"
                              >
                                {dep.pods.map((pod) => {
                                  const isSelected = selectedPod === pod.name;
                                  const sColor = getStatusColor(pod.status, pod.restarts);
                                  return (
                                    <button
                                      key={pod.name}
                                      onClick={() => setSelectedPod(pod.name)}
                                      className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium font-sans transition-all shadow-2xs ${
                                        isSelected
                                          ? "bg-accent-cyan/15 text-accent-cyan font-bold border border-accent-cyan/30"
                                          : "hover:bg-elevated text-muted hover:text-primary"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate font-mono">
                                        <CircleDot size={12} style={{ color: sColor }} className="shrink-0" />
                                        <span className="truncate">{pod.name.split('-').slice(-2).join('-')}</span>
                                      </div>
                                      {pod.restarts > 0 && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-accent-red/10 border border-accent-red/20 text-accent-red font-bold rounded-md shrink-0 shadow-2xs">
                                          {pod.restarts}r
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
