import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Moon, Sun, AlertCircle, ChevronDown, Cpu, Sparkles, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNamespaceContext } from "../context/NamespaceContext";

export function Header({ podCount, criticalCount, connectionStatus, namespaces }) {
  const { theme, toggleTheme } = useTheme();
  const { selectedNamespace, setSelectedNamespace } = useNamespaceContext();
  
  const [query, setQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [showPopover, setShowPopover] = useState(false);
  const [time, setTime] = useState(new Date());

  const isConnected = connectionStatus === "connected" || connectionStatus === "fallback";

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsThinking(true);
    setShowPopover(true);
    try {
      const res = await axios.post(`http://localhost:8000/api/query?query=${encodeURIComponent(query)}`);
      setAnswer(res.data);
    } catch (err) {
      setAnswer({ answer: "Failed to connect to AI engine.", generation_time_ms: 0 });
    } finally {
      setIsThinking(false);
    }
  };

  const setSuggestedQuery = (q) => {
    setQuery(q);
    setShowPopover(false);
    setAnswer(null);
  };

  return (
    <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-subtle flex items-center justify-between px-6 gap-4 sticky top-0 z-50 shadow-sm">
      {/* Left: Branding & Clock */}
      <div className="flex items-center gap-6 shrink-0">
        <Link to="/" className="flex items-center gap-2">
          <div className="font-display font-bold text-xl tracking-tight">
            Pod<span className="text-accent-cyan">Master</span>
          </div>
        </Link>
        <div className="text-xs font-mono text-text-muted hidden md:block">
          {time.toLocaleTimeString([], { hour12: false })} UTC
        </div>
        
        {/* Backend Health Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-bg-elevated border border-subtle">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-accent-emerald pulse" : "bg-accent-red"}`} />
          <span className="text-[10px] font-mono text-text-secondary uppercase">
            {isConnected ? "Engine Sync" : "Offline"}
          </span>
        </div>
      </div>

      {/* Center: AI Query Box */}
      <div className="flex-1 max-w-2xl hidden lg:flex justify-center relative">
        <form onSubmit={handleQuery} className="w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-accent-violet">
            <Sparkles size={16} />
          </div>
          <input
            type="text"
            className="w-full bg-bg-base border border-subtle hover:border-accent-violet/50 focus:border-accent-violet text-text-primary pl-10 pr-4 py-1.5 rounded-full text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent-violet/20 transition-all shadow-inner placeholder-text-muted/50"
            placeholder="Ask PodMaster AI (e.g. 'Why is cpu high?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && !showPopover && (
             <button type="submit" className="absolute inset-y-0 right-2 flex items-center text-xs text-text-muted hover:text-accent-violet font-mono">
               Press Enter ↵
             </button>
          )}
        </form>

        {/* AI Answer Popover */}
        {showPopover && (
          <div className="absolute top-full mt-2 w-full bg-bg-elevated border border-subtle rounded-xl shadow-2xl p-4 z-50">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2 text-accent-violet font-mono text-xs">
                <Sparkles size={14} /> AI Analysis
              </div>
              <button onClick={() => { setShowPopover(false); setAnswer(null); setQuery(""); }} className="text-text-muted hover:text-text-primary">
                <X size={14} />
              </button>
            </div>
            
            {isThinking ? (
              <div className="py-4 flex flex-col items-center justify-center gap-2 text-text-muted">
                <div className="w-5 h-5 border-2 border-accent-violet border-t-transparent rounded-full spin"></div>
                <div className="text-xs font-mono pulse">Analyzing cluster telemetry...</div>
              </div>
            ) : answer ? (
              <div className="text-sm text-text-primary leading-relaxed bg-bg-surface p-3 rounded border border-subtle font-body">
                {answer.answer}
                <div className="text-[10px] text-text-muted mt-2 font-mono flex items-center gap-2 border-t border-subtle pt-2">
                  <span>Generated in {answer.generation_time_ms}ms</span>
                  <span>•</span>
                  <span>Model: OpenRouter AI</span>
                </div>
              </div>
            ) : null}

            {!answer && !isThinking && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSuggestedQuery("What caused the latest restart?")} className="shrink-0 px-2 py-1 bg-bg-base border border-subtle rounded text-[10px] text-text-secondary hover:text-accent-violet font-mono">Why did pod restart?</button>
                <button onClick={() => setSuggestedQuery("Show me nodes with high load")} className="shrink-0 px-2 py-1 bg-bg-base border border-subtle rounded text-[10px] text-text-secondary hover:text-accent-violet font-mono">Nodes with high load</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Badges & Controls */}
      <div className="flex items-center gap-4 shrink-0">
        
        {/* Badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-base rounded border border-subtle">
            <Cpu size={12} className="text-accent-amber" />
            <span className="text-xs font-mono text-text-secondary">0 CPU &gt; 80%</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 bg-bg-base rounded border ${criticalCount > 0 ? 'border-accent-red/50 bg-accent-red/10' : 'border-subtle'}`}>
            <AlertCircle size={12} className={criticalCount > 0 ? "text-accent-red pulse" : "text-text-secondary"} />
            <span className={`text-xs font-mono font-bold ${criticalCount > 0 ? "text-accent-red" : "text-text-secondary"}`}>
              {criticalCount} CRIT
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-bg-base rounded border border-subtle">
            <span className="text-xs font-mono text-text-secondary">{podCount} Pods</span>
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 bg-bg-base hover:bg-elevated border border-subtle rounded transition-colors"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun size={14} className="text-accent-amber" />
          ) : (
            <Moon size={14} className="text-accent-cyan" />
          )}
        </button>

        {/* About Link */}
        <Link to="/about" className="text-xs font-mono font-600 px-3 py-1.5 bg-accent-cyan/10 text-accent-cyan hover:bg-accent-cyan/20 rounded transition-colors uppercase tracking-wider">
          About
        </Link>
      </div>
    </header>
  );
}
