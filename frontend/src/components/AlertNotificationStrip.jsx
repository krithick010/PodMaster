import React, { useEffect, useState } from "react";
import axios from "axios";
import { BellRing, RefreshCw, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function AlertNotificationStrip() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissedKeys, setDismissedKeys] = useState([]);

  const fetchAlerts = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/alerts/active");
      setAlerts(res.data.alerts || []);
    } catch (error) {
      console.error("Error fetching active alerts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = alerts.filter((alert) => alert.status === "triggered" && !dismissedKeys.includes(alert.id));

  if (loading || activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-[70] border-b border-red-500/20 bg-red-500/10 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-[1900px] px-6 py-2.5 flex items-center gap-3 text-red-100">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 border border-red-500/30">
            <BellRing size={16} className="text-red-200" />
          </div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-red-200">
            Active Alert Notification
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 whitespace-nowrap">
            {activeAlerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-full border border-red-500/25 bg-surface/90 px-3 py-1.5 text-xs text-primary shadow-sm"
              >
                <TriangleAlert size={14} className="text-red-400 shrink-0" />
                <span className="font-semibold">{alert.name}</span>
                <span className="font-mono text-[10px] uppercase text-muted">{alert.service}</span>
                {alert.last_triggered_at && (
                  <span className="font-mono text-[10px] text-muted">
                    {new Date(alert.last_triggered_at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedKeys((current) => [...current, alert.id])}
                  className="ml-1 rounded-full p-1 text-muted transition-colors hover:text-primary"
                  aria-label={`Dismiss alert ${alert.name}`}
                >
                  <X size={12} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAlerts}
          className="shrink-0 rounded-full border border-red-500/20 bg-surface/80 p-2 text-red-200 transition-colors hover:bg-red-500/15"
          title="Refresh alerts"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
}