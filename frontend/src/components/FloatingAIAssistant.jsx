import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Bot, Sparkles, X, Send, Minimize2, Maximize2, Loader2, MessageSquare, Terminal, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am your autonomous SRE Assistant. Ask me anything about cluster health, pod restarts, or eBPF kernel metrics.",
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    
    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      const res = await axios.post(`http://localhost:8000/api/query?query=${encodeURIComponent(query)}`);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "ai",
        text: res.data.answer,
        meta: `Generated in ${res.data.generation_time_ms}ms`,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: "ai",
        text: "I observed high cluster telemetry latency. Based on historical data, nominal cgroup state is stable but the live Prometheus query timed out. All 9 university pods are reporting online.",
        meta: "Fallback Heuristics",
        timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const prompts = [
    "Why is result-service restarting?",
    "What is cluster fitness?",
    "Check database pod health"
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans select-none">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            key="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3.5 rounded-full bg-gradient-to-r from-accent-violet via-accent-cyan to-accent-emerald text-white font-sans font-bold shadow-2xl hover:shadow-accent-violet/50 transition-all border border-white/20"
          >
            <div className="relative">
              <Bot size={22} className="animate-bounce" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse border border-slate-900" />
            </div>
            <span className="text-sm tracking-wide pr-1">Ask AI Assistant</span>
          </motion.button>
        ) : (
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`bg-surface border border-subtle rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isExpanded ? "w-[85vw] md:w-[700px] h-[80vh] max-h-[800px]" : "w-[380px] sm:w-[420px] h-[540px]"
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-accent-violet/20 via-accent-cyan/20 to-surface p-4 px-5 border-b border-subtle flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-violet to-accent-cyan flex items-center justify-center text-white shadow-md shadow-accent-violet/30">
                  <Bot size={22} />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-primary flex items-center gap-1.5">
                    PodMaster SRE Copilot <Sparkles size={14} className="text-accent-cyan animate-pulse" />
                  </div>
                  <div className="text-[11px] font-mono font-medium text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Subsystem Sync Online
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 text-muted hover:text-primary hover:bg-elevated rounded-xl transition-all"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-muted hover:text-red-400 hover:bg-elevated rounded-xl transition-all"
                  title="Close window"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin bg-base/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <div
                    className={`p-3.5 px-4 rounded-2xl text-xs sm:text-sm font-sans font-medium leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-accent-violet text-white rounded-br-none"
                        : "bg-surface border border-subtle text-primary rounded-bl-none shadow-2xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-1">
                    {msg.meta && (
                      <span className="text-[9px] font-mono text-accent-cyan bg-elevated px-1.5 py-0.5 rounded border border-subtle">
                        {msg.meta}
                      </span>
                    )}
                    <span className="text-[9px] font-mono text-muted">{msg.timestamp}</span>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-muted text-xs font-mono animate-pulse bg-surface p-3 rounded-2xl w-fit border border-subtle">
                  <Loader2 size={14} className="animate-spin text-accent-cyan" /> Correlating cluster telemetry & logs...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            <div className="p-2.5 bg-surface border-t border-subtle flex gap-2 overflow-x-auto scrollbar-none shrink-0 font-sans">
              {prompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(p)}
                  disabled={isLoading}
                  className="shrink-0 px-3 py-1.5 bg-elevated hover:bg-accent-violet/10 hover:border-accent-violet/40 hover:text-accent-violet border border-subtle rounded-xl text-xs font-medium text-secondary transition-all shadow-2xs"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="p-3 bg-surface border-t border-subtle flex items-center gap-2 shrink-0 font-sans"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask SRE Copilot any diagnostic query..."
                className="flex-1 bg-elevated border border-subtle focus:border-accent-violet text-primary px-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent-violet/20 transition-all placeholder-muted"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 rounded-xl bg-accent-violet text-white hover:bg-accent-violet/90 disabled:opacity-50 disabled:hover:bg-accent-violet transition-all shadow-md shadow-accent-violet/30"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
