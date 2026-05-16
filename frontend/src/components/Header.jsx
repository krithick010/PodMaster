import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { Moon, Sun, Sparkles, X, LayoutDashboard, Info } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNamespaceContext } from "../context/NamespaceContext";

export function Header({ connectionStatus }) {
  const { theme, toggleTheme } = useTheme();
  const { selectedNamespace } = useNamespaceContext();
  const location = useLocation();
  
  const [query, setQuery] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [showPopover, setShowPopover] = useState(false);

  const isConnected = connectionStatus === "connected" || connectionStatus === "fallback";

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
    <header className="h-14 bg-surface/80 backdrop-blur-md border-b border-subtle flex items-center justify-between px-6 gap-4 sticky top-0 z-50 shadow-sm font-sans select-none">
      {/* Left: Branding & Engine Status */}
      <div className="flex items-center gap-4 shrink-0 font-sans">
        <Link to="/" className="flex items-center gap-2">
          <div className="font-display font-extrabold text-xl tracking-tight text-primary">
            Pod<span className="text-accent-cyan">Master</span>
          </div>
        </Link>
        
        {/* Engine Sync Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-elevated border border-subtle shadow-2xs font-sans">
          <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-accent-emerald animate-pulse" : "bg-accent-red"}`} />
          <span className="text-[11px] font-mono font-bold text-secondary uppercase tracking-wider">
            {isConnected ? "Engine Sync" : "Offline"}
          </span>
        </div>
      </div>

      {/* Center: Natural Language AI Query Box */}
      <div className="flex-1 max-w-2xl hidden lg:flex justify-center relative font-sans">
        <form onSubmit={handleQuery} className="w-full relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-accent-violet">
            <Sparkles size={16} />
          </div>
          <input
            type="text"
            className="w-full bg-surface border border-subtle hover:border-accent-violet/50 focus:border-accent-violet text-primary pl-10 pr-24 py-2 rounded-full text-xs font-sans font-medium focus:outline-none focus:ring-2 focus:ring-accent-violet/20 transition-all shadow-inner placeholder-muted"
            placeholder="Ask PodMaster AI (e.g. 'Why is result-service restarting?')"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && !showPopover && (
            <button type="submit" className="absolute inset-y-0 right-3 flex items-center text-[11px] text-muted hover:text-accent-violet font-mono font-bold">
              Press Enter ↵
            </button>
          )}
        </form>

        {/* AI Answer Popover */}
        {showPopover && (
          <div className="absolute top-full mt-2 w-full bg-surface border border-subtle rounded-2xl shadow-2xl p-5 z-50 font-sans">
            <div className="flex justify-between items-center mb-3 border-b border-subtle pb-2.5">
              <div className="flex items-center gap-2 text-accent-violet font-sans font-bold text-xs uppercase tracking-wider font-display">
                <Sparkles size={16} /> AI Root Cause Analysis
              </div>
              <button onClick={() => { setShowPopover(false); setAnswer(null); setQuery(""); }} className="text-muted hover:text-primary p-1 bg-elevated rounded-full border border-subtle">
                <X size={14} />
              </button>
            </div>
            
            {isThinking ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-muted font-sans">
                <div className="w-6 h-6 border-2 border-accent-violet border-t-transparent rounded-full animate-spin" />
                <div className="text-xs font-mono animate-pulse font-semibold">Correlating cluster metrics & logs...</div>
              </div>
            ) : answer ? (
              <div className="text-xs text-primary leading-relaxed bg-elevated p-4 rounded-xl border border-subtle font-sans font-medium shadow-2xs">
                {answer.answer}
                <div className="text-[10px] text-muted mt-3 font-mono flex items-center gap-2 border-t border-subtle pt-2.5">
                  <span>Generation Time: <strong className="text-primary">{answer.generation_time_ms}ms</strong></span>
                  <span>•</span>
                  <span>Model: OpenRouter Phi-3 Subsystem</span>
                </div>
              </div>
            ) : null}

            {!answer && !isThinking && (
              <div className="mt-3.5 flex gap-2 overflow-x-auto pb-1 font-mono">
                <button onClick={() => setSuggestedQuery("What caused the latest restart?")} className="shrink-0 px-2.5 py-1 bg-surface hover:bg-elevated border border-subtle rounded-lg text-[10px] text-secondary hover:text-accent-violet font-semibold transition-all">Why did pod restart?</button>
                <button onClick={() => setSuggestedQuery("Show me pods with high memory")} className="shrink-0 px-2.5 py-1 bg-surface hover:bg-elevated border border-subtle rounded-lg text-[10px] text-secondary hover:text-accent-violet font-semibold transition-all">Pods with high memory</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Navigation Controls & Theme */}
      <div className="flex items-center gap-3 shrink-0 font-sans font-bold">
        <Link 
          to="/" 
          onClick={(e) => {
            if (location.pathname === "/") {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('resetDashboardView'));
            }
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-2xs border font-sans font-bold uppercase tracking-wider ${
            location.pathname === "/" 
              ? "bg-accent-cyan text-white border-accent-cyan/80 shadow-xs" 
              : "bg-surface hover:bg-elevated text-secondary hover:text-primary border-subtle"
          }`}
        >
          <LayoutDashboard size={14} /> Dashboard
        </Link>
        
        <Link 
          to="/about" 
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all shadow-2xs border font-sans font-bold uppercase tracking-wider ${
            location.pathname === "/about" 
              ? "bg-accent-cyan text-white border-accent-cyan/80 shadow-xs" 
              : "bg-surface hover:bg-elevated text-secondary hover:text-primary border-subtle"
          }`}
        >
          <Info size={14} /> About
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 bg-surface hover:bg-elevated border border-subtle rounded-lg text-secondary hover:text-primary transition-all shadow-2xs"
          title="Switch theme"
        >
          {theme === "dark" ? (
            <Sun size={15} className="text-accent-amber animate-spin-slow" />
          ) : (
            <Moon size={15} className="text-accent-violet" />
          )}
        </button>
      </div>
    </header>
  );
}

