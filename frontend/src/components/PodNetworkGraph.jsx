import React, { useState, useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import axios from "axios";
import { motion } from "framer-motion";
import { Activity, Globe, Shield, RefreshCw } from "lucide-react";

cytoscape.use(coseBilkent);

export function PodNetworkGraph() {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [topology, setTopology] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  const fetchTopology = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/topology/services");
      setTopology(res.data);
    } catch (e) {
      console.error("Error fetching service topology", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!containerRef.current || topology.nodes.length === 0) return;

    const elements = [];
    const nsSet = new Set();

    // Create namespace parents
    topology.nodes.forEach(n => {
      if (n.namespace && !nsSet.has(n.namespace)) {
        nsSet.add(n.namespace);
        elements.push({
          data: { id: n.namespace, label: n.namespace.toUpperCase(), type: 'namespace' }
        });
      }
    });

    // Create service nodes
    topology.nodes.forEach(n => {
      let status = 'healthy';
      let glowColor = '#10b981'; // emerald
      if (n.health === 'CRIT') { status = 'critical'; glowColor = '#ef4444'; }
      else if (n.health === 'WARN') { status = 'warning'; glowColor = '#f59e0b'; }

      elements.push({
        data: {
          id: n.id,
          label: n.id,
          type: 'service',
          status: status,
          glow: glowColor,
          parent: n.namespace || undefined
        }
      });
    });

    // Create edges
    topology.edges.forEach((e, idx) => {
      elements.push({
        data: {
          id: `edge-${idx}`,
          source: e.source,
          target: e.target,
          label: `${e.latency_ms}ms`,
          status: e.status || 'healthy'
        }
      });
    });

    const initCy = () => {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: 'node[type="namespace"]',
            style: {
              'background-color': '#f8fafc',
              'background-opacity': 0.7,
              'label': 'data(label)',
              'color': '#ffffff',
              'font-size': '14px',
              'font-family': 'sans-serif',
              'font-weight': 'bold',
              'text-valign': 'top',
              'text-halign': 'center',
              'text-margin-y': -16,
              'text-background-opacity': 1,
              'text-background-color': '#0f172a',
              'text-background-padding': '6px',
              'text-background-shape': 'roundrectangle',
              'text-border-width': 1,
              'text-border-color': '#334155',
              'border-width': 2,
              'border-color': '#94a3b8',
              'border-style': 'dashed',
              'shape': 'round-rectangle',
              'padding': 40
            }
          },
          {
            selector: 'node[type="service"]',
            style: {
              'background-color': '#ffffff',
              'label': 'data(label)',
              'color': '#0f172a',
              'font-size': '12px',
              'font-family': 'sans-serif',
              'font-weight': 'bold',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 8,
              'text-background-opacity': 1,
              'text-background-color': '#ffffff',
              'text-background-padding': '4px',
              'text-background-shape': 'roundrectangle',
              'text-border-width': 1,
              'text-border-color': '#cbd5e1',
              'width': 28,
              'height': 28,
              'shape': 'ellipse',
              'border-width': 3,
              'border-color': 'data(glow)',
            }
          },
          {
            selector: 'node[status="critical"]',
            style: { 'width': 34, 'height': 34, 'border-width': 4 }
          },
          {
            selector: 'edge',
            style: {
              'width': 2.5,
              'line-color': '#94a3b8',
              'curve-style': 'bezier',
              'label': 'data(label)',
              'font-size': '10px',
              'font-weight': 'bold',
              'color': '#0f172a',
              'text-background-opacity': 1,
              'text-background-color': '#ffffff',
              'text-background-padding': '4px',
              'text-background-shape': 'roundrectangle',
              'text-border-width': 1,
              'text-border-color': '#cbd5e1',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#94a3b8',
              'arrow-scale': 1.2,
              'opacity': 0.85,
            }
          }
        ],
        layout: {
          name: 'cose-bilkent',
          animate: true,
          randomize: true,
          nodeRepulsion: 150000,
          idealEdgeLength: 120,
          fit: true,
          padding: 50
        },
        userZoomingEnabled: false,
        userPanningEnabled: false,
        boxSelectionEnabled: false,
      });
    };

    if (!cyRef.current) {
      initCy();
    } else {
      cyRef.current.json({ elements });
      cyRef.current.layout({
        name: 'cose-bilkent',
        animate: true,
        nodeRepulsion: 150000,
        idealEdgeLength: 120,
        fit: true,
        padding: 50
      }).run();
    }
  }, [topology]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-surface border border-subtle rounded-xl flex flex-col h-full min-h-[480px] shadow-lg relative overflow-hidden text-primary font-sans"
    >
      <div className="px-5 py-4 border-b border-subtle flex items-center justify-between bg-elevated/50">
        <div className="flex items-center gap-3">
          <Globe size={18} className="text-accent-cyan" />
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">
            Service Topology Map v2
          </h3>
          <button onClick={fetchTopology} className="p-1.5 rounded hover:bg-border text-muted hover:text-accent-cyan transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-emerald">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-emerald shadow-sm"></span>
            HEALTHY
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-amber">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-amber shadow-sm"></span>
            DEGRADED
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-accent-red">
            <span className="w-2.5 h-2.5 rounded-full bg-accent-red shadow-sm"></span>
            CRITICAL
          </div>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 w-full bg-surface relative z-0" />

      <div className="absolute bottom-4 left-4 z-10 flex gap-2.5 font-mono">
        <div className="px-2.5 py-1 bg-elevated border border-subtle rounded text-[10px] font-semibold text-muted flex items-center gap-1.5 shadow-sm">
          <Shield size={12} className="text-accent-emerald" />
          mTLS SECURE
        </div>
        <div className="px-2.5 py-1 bg-elevated border border-subtle rounded text-[10px] font-semibold text-muted flex items-center gap-1.5 shadow-sm">
          <Activity size={12} className="text-accent-cyan" />
          BPF ACTIVE
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </motion.div>
  );
}
