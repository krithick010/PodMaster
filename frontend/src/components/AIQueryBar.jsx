import React, { useState } from "react";
import axios from "axios";
import { Sparkles, Send, Loader2, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AIQueryBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [genTime, setGenTime] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query || loading) return;

    setLoading(true);
    setResponse(null);
    try {
      const res = await axios.post("http://localhost:8000/api/query", { question: query });
      setResponse(res.data.answer);
      setGenTime(res.data.generation_time_ms);
    } catch (e) {
      console.error("AI query error", e);
      setResponse("⚠️ Unable to connect to OpenRouter cluster intelligence. Please check AI engine status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col text-primary font-sans">
      <div className="flex items-center gap-2.5 mb-4">
        <Bot size={20} className="text-accent-violet" />
        <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
          Ask PodMaster AI (Natural-Language SRE Assistant)
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center mb-3 font-mono">
        <input
          type="text"
          placeholder="e.g., Why is result-service-0 restarting? What are the top memory hotspots?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-elevated border border-subtle rounded-xl pl-4 pr-12 py-3 text-xs text-primary placeholder-muted focus:outline-none focus:border-accent-violet transition-colors shadow-inner font-mono"
        />
        <button
          type="submit"
          disabled={loading || !query}
          className="absolute right-2 p-2 bg-accent-violet hover:bg-accent-violet/90 disabled:bg-accent-violet/30 disabled:text-muted text-white rounded-lg transition-colors shadow-xs"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 bg-elevated/50 rounded-xl border border-subtle flex items-center gap-3 text-xs font-mono text-muted">
            <Sparkles size={16} className="text-accent-violet animate-spin" />
            <span>Consulting OpenRouter SRE intelligence across active cluster telemetry...</span>
          </motion.div>
        )}

        {response && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-elevated rounded-xl border border-accent-violet/40 text-xs font-sans text-primary leading-relaxed shadow-sm relative">
            <div className="absolute top-2.5 right-3.5 text-[10px] font-mono text-accent-violet font-bold">
              ⚡ ~{genTime}ms
            </div>
            <div className="whitespace-pre-wrap font-mono text-xs">{response}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
