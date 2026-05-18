import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, FlaskConical, RefreshCw } from "lucide-react";

const CHAOS_STORAGE_KEY = "podmaster.chaos.activeInjections";

const readActiveInjections = () => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CHAOS_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const now = Date.now();
    return parsed.filter((injection) => {
      const remaining = (injection.duration * 1000) - (now - injection.startTime);
      return Number.isFinite(remaining) && remaining > 0;
    });
  } catch (error) {
    return [];
  }
};

export function ChaosStatusStrip() {
  const [activeInjections, setActiveInjections] = useState(() => readActiveInjections());

  useEffect(() => {
    const refresh = () => setActiveInjections(readActiveInjections());

    const handleStorage = (event) => {
      if (!event.key || event.key === CHAOS_STORAGE_KEY) {
        refresh();
      }
    };

    const interval = setInterval(() => {
      refresh();
    }, 1000);

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", refresh);
    refresh();

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (activeInjections.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[80] border-b border-red-500/20 bg-[#130b0b]/90 backdrop-blur-md shadow-md">
      <div className="mx-auto max-w-[1900px] px-6 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
            <FlaskConical size={15} className="text-red-300" />
          </div>
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-red-200">
              Chaos Active
            </div>
            <div className="text-[10px] text-red-200/70 font-mono">
              {activeInjections.length} injected scenario{activeInjections.length === 1 ? "" : "s"} still running
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <AnimatePresence initial={false}>
              {activeInjections.map((injection) => {
                const remainingSeconds = Math.max(
                  0,
                  Math.ceil((injection.duration * 1000 - (Date.now() - injection.startTime)) / 1000)
                );

                return (
                  <motion.div
                    key={injection.uid}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 rounded-full border border-red-500/25 bg-surface/95 px-3 py-1.5 text-xs text-primary shadow-sm"
                  >
                    <AlertTriangle size={14} className="text-red-400 shrink-0" />
                    <span className="font-semibold">{injection.label}</span>
                    <span className="font-mono text-[10px] uppercase text-muted">
                      {injection.namespace}/{injection.pod}
                    </span>
                    <span className="font-mono text-[10px] text-red-300">
                      T-{remainingSeconds}s
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-red-200/70">
          <RefreshCw size={12} className="animate-spin" style={{ animationDuration: "4s" }} />
          live persisted state
        </div>
      </div>
    </div>
  );
}
