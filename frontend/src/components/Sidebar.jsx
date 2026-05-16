import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Box, Search, Filter } from "lucide-react";
import { ClusterExplorer } from "./ClusterExplorer";

export function Sidebar({ isOpen, setIsOpen, metrics, anomalies, selectedPod, setSelectedPod }) {
  const [filterQuery, setFilterQuery] = useState("");

  const quickFilters = ["All", "Running", "Issues", "Frontend", "Backend"];

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isOpen ? 260 : 0 }}
      className="h-full bg-surface border-r border-subtle flex flex-col z-20 shrink-0 relative overflow-visible shadow-lg select-none font-sans"
    >
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3.5 top-6 w-7 h-7 bg-surface border border-subtle rounded-full flex items-center justify-center text-muted hover:text-accent-cyan hover:border-accent-cyan transition-colors z-30 shadow-md"
      >
        {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full overflow-hidden w-[260px]"
          >
            <div className="p-4 border-b border-subtle bg-elevated/30 space-y-2.5">
              <div className="relative font-sans">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input 
                  type="text" 
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter pods or status..."
                  className="w-full bg-surface border border-subtle rounded-lg text-xs py-2 pl-9 pr-7 text-primary placeholder-muted focus:outline-none focus:border-accent-cyan transition-all shadow-inner font-sans"
                />
                {filterQuery && (
                  <button 
                    onClick={() => setFilterQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted hover:text-primary font-mono bg-elevated px-1.5 py-0.5 rounded border border-subtle"
                  >
                    CLR
                  </button>
                )}
              </div>

              {/* Quick Filter Tags */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {quickFilters.map(tag => {
                  const tagValue = tag === "All" ? "" : tag.toLowerCase();
                  const isActive = filterQuery.toLowerCase() === tagValue;
                  return (
                    <button
                      key={tag}
                      onClick={() => setFilterQuery(tagValue)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all font-sans ${
                        isActive 
                          ? "bg-accent-cyan text-white shadow-2xs font-bold" 
                          : "bg-surface border border-subtle text-muted hover:text-primary hover:bg-elevated"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin space-y-1">
              <button 
                onClick={() => setSelectedPod("all")}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold font-mono transition-all ${selectedPod === "all" ? "bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/30 shadow-xs" : "text-muted hover:bg-elevated hover:text-primary"}`}
              >
                <Box size={16} /> All Pods
              </button>

              {/* Feature 2: Embed Advanced Cluster Explorer */}
              <ClusterExplorer selectedPod={selectedPod} setSelectedPod={setSelectedPod} filterQuery={filterQuery} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
