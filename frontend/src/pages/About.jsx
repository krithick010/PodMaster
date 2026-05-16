import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export function About() {
  return (
    <div className="min-h-screen bg-base">
      {/* Back Button */}
      <div className="h-12 bg-surface border-subtle flex items-center px-6 sticky top-0 z-10">
        <Link to="/" className="flex items-center gap-2 text-accent-cyan hover:text-accent-emerald transition-colors">
          <ChevronLeft size={18} />
          <span className="text-sm font-mono">Back to Dashboard</span>
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="font-display font-700 text-3xl text-accent-cyan mb-4">
            KubeVision AI
          </h1>
          <p className="text-text-secondary">
            A next-generation Kubernetes observability platform powered by autonomous AI agents.
            Detects anomalies across all layers of your cluster and provides actionable insights
            backed by LLM analysis.
          </p>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <h2 className="font-display font-600 text-xl text-accent-emerald">Architecture</h2>
          <div className="bg-elevated border-subtle rounded-lg p-6 space-y-3 font-mono text-sm">
            <div>
              <div className="text-accent-cyan font-600">Backend (FastAPI)</div>
              <ul className="text-text-secondary mt-2 ml-4 space-y-1">
                <li>• 6 autonomous detection agents</li>
                <li>• Orchestrator framework</li>
                <li>• SQLite persistence</li>
                <li>• WebSocket real-time updates</li>
                <li>• Ollama LLM integration</li>
                <li>• Prometheus metrics</li>
                <li>• Kubernetes API integration</li>
              </ul>
            </div>
            <div className="mt-6">
              <div className="text-accent-violet font-600">Agents (6 Total)</div>
              <ul className="text-text-secondary mt-2 ml-4 space-y-1">
                <li>• <span className="text-accent-amber">CPU Agent</span> - Spike detection &gt;80%</li>
                <li>• <span className="text-accent-amber">Memory Agent</span> - Leak detection &gt;80%</li>
                <li>• <span className="text-accent-amber">Network Agent</span> - Traffic anomalies</li>
                <li>• <span className="text-accent-emerald">Storage Agent</span> (NEW) - PVC pressure + I/O correlation</li>
                <li>• <span className="text-accent-emerald">LogIO Agent</span> (NEW) - Error rate spikes</li>
                <li>• <span className="text-accent-emerald">Scheduling Agent</span> (NEW) - Pod scheduling failures</li>
              </ul>
            </div>
            <div className="mt-6">
              <div className="text-accent-cyan font-600">Demo Workloads</div>
              <ul className="text-text-secondary mt-2 ml-4 space-y-1">
                <li>• student-portal (CPU-intensive)</li>
                <li>• attendance-service (PVC writes)</li>
                <li>• result-service (Matrix math, cross-namespace calls)</li>
                <li>• notification-service (Error logs, network stress)</li>
              </ul>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="font-display font-600 text-xl text-accent-cyan">Key Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Multi-Namespace", desc: "Automatic discovery and monitoring across all namespaces" },
              { title: "Real-Time Updates", desc: "WebSocket-driven live dashboard with zero latency" },
              { title: "LLM Insights", desc: "Ollama-powered anomaly explanations with fallback templates" },
              { title: "Storage Correlation", desc: "Unique PVC + restart correlation for I/O issues" },
              { title: "Chaos Engine", desc: "Controlled anomaly injection for testing and demos" },
              { title: "Forecasting", desc: "EWMA-based trend prediction for proactive scaling" },
              { title: "Recommendations", desc: "Actionable kubectl commands for remediation" },
              { title: "Cross-Pod Correlation", desc: "Dependency mapping and cascading failure detection" },
            ].map((item, idx) => (
              <div
                key={idx}
                className="bg-elevated border-subtle rounded-lg p-4"
              >
                <h3 className="text-sm font-600 text-accent-violet">{item.title}</h3>
                <p className="text-xs text-text-secondary mt-2">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-4"
        >
          <h2 className="font-display font-600 text-xl text-accent-emerald">Tech Stack</h2>
          <div className="bg-elevated border-subtle rounded-lg p-6 font-mono text-sm space-y-2">
            <div><span className="text-accent-cyan">Backend:</span> FastAPI, aiosqlite, Kubernetes Python Client</div>
            <div><span className="text-accent-cyan">Metrics:</span> Prometheus API, multi-namespace queries</div>
            <div><span className="text-accent-cyan">LLM:</span> Ollama (phi3.5), fallback templates</div>
            <div><span className="text-accent-cyan">Frontend:</span> React 19, Framer Motion, Recharts, Tailwind</div>
            <div><span className="text-accent-cyan">Container:</span> Docker, Kubernetes manifests</div>
            <div><span className="text-accent-cyan">Database:</span> SQLite3 with indexes</div>
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="font-display font-600 text-xl text-accent-red">Deployment</h2>
          <div className="bg-elevated border-subtle rounded-lg p-6 font-mono text-xs space-y-3 overflow-x-auto">
            <div>
              <div className="text-accent-amber font-600 mb-2"># Build workload images</div>
              <div className="text-text-secondary">cd workloads && docker build -t student-portal student-portal/</div>
            </div>
            <div>
              <div className="text-accent-amber font-600 mb-2"># Apply K8s manifests</div>
              <div className="text-text-secondary">kubectl apply -f k8s/namespaces.yaml</div>
              <div className="text-text-secondary">kubectl apply -f k8s/rbac.yaml</div>
              <div className="text-text-secondary">kubectl apply -f k8s/university-data/</div>
            </div>
            <div>
              <div className="text-accent-amber font-600 mb-2"># Start backend</div>
              <div className="text-text-secondary">cd backend && python main.py</div>
            </div>
            <div>
              <div className="text-accent-amber font-600 mb-2"># Start frontend</div>
              <div className="text-text-secondary">cd frontend && npm start</div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center py-8 text-text-secondary text-sm"
        >
          <p>KubeVision AI © 2024 | Competition Project</p>
        </motion.section>
      </div>
    </div>
  );
}
