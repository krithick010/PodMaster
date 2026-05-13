import React from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, AlertCircle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useNamespaceContext } from "../context/NamespaceContext";

export function Header({ podCount, criticalCount, connectionStatus, namespaces }) {
  const { theme, toggleTheme } = useTheme();
  const { selectedNamespace, setSelectedNamespace } = useNamespaceContext();

  const isConnected = connectionStatus === "connected";

  return (
    <header className="h-12 bg-surface border-subtle flex items-center justify-between px-6 gap-4">
      {/* Left: Branding */}
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="font-display font-700 text-lg">
          KubeVision <span className="text-accent-cyan">AI</span>
        </div>
      </Link>

      {/* Center: Namespace Selector */}
      <div className="flex-1 flex justify-center">
        <select
          value={selectedNamespace}
          onChange={(e) => setSelectedNamespace(e.target.value)}
          className="bg-elevated border-subtle px-3 py-1 rounded text-sm font-mono cursor-pointer hover:border-accent-cyan transition-colors"
        >
          <option value="all">all namespaces</option>
          {namespaces.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Status Indicators and Controls */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Pod Count */}
        <div className="text-xs font-mono text-text-secondary">
          {podCount} <span className="text-text-muted">pods</span>
        </div>

        {/* Critical Alerts Badge */}
        {criticalCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-elevated rounded-full border-subtle animate-none">
            <AlertCircle size={14} className="text-accent-red" />
            <span className="text-xs font-mono font-600 text-accent-red">
              {criticalCount}
            </span>
          </div>
        )}

        {/* WebSocket Connection Status */}
        <div className="flex items-center gap-1">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-accent-emerald glow-pulse" : "bg-accent-red"
            }`}
          />
          <span className="text-xs font-mono text-text-muted hidden sm:inline">
            {isConnected ? "live" : "offline"}
          </span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1 hover:bg-elevated rounded transition-colors"
          title="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun size={18} className="text-accent-amber" />
          ) : (
            <Moon size={18} className="text-accent-cyan" />
          )}
        </button>

        {/* About Link */}
        <Link to="/about" className="text-xs font-mono text-text-secondary hover:text-accent-cyan transition-colors">
          About
        </Link>
      </div>
    </header>
  );
}
