import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { motion } from "framer-motion";
import { Activity, Globe, Shield } from "lucide-react";

// Register the cose-bilkent layout extension
cytoscape.use(coseBilkent);

export function PodNetworkGraph({ metrics, anomalies }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !metrics) return;

    // Build elements
    const elements = [];
    const namespaces = Object.keys(metrics);

    namespaces.forEach((namespace) => {
      // Add namespace parent node
      elements.push({
        data: { id: namespace, label: namespace.toUpperCase(), type: 'namespace' }
      });

      // Add pod nodes
      const pods = metrics[namespace];
      Object.keys(pods).forEach((podName) => {
        // Check if this pod has an anomaly
        const podAnomalies = anomalies.filter(a => a.pod_name === podName);
        let status = 'healthy';
        let glowColor = '#10b981'; // emerald
        
        if (podAnomalies.some(a => a.severity === 'critical')) {
          status = 'critical';
          glowColor = '#ef4444'; // red
        } else if (podAnomalies.some(a => a.severity === 'warning')) {
          status = 'warning';
          glowColor = '#f59e0b'; // amber
        }

        elements.push({
          data: { 
            id: podName, 
            label: podName.substring(0, 12), 
            fullName: podName,
            type: 'pod',
            status: status,
            glow: glowColor,
            parent: namespace // Grouping by namespace
          }
        });

        // Add edge from namespace hub to pod
        // We'll create a central hub node for each namespace for better visuals
        const hubId = `${namespace}-hub`;
        if (!elements.find(e => e.data.id === hubId)) {
            elements.push({
                data: { id: hubId, label: 'HUB', type: 'hub', parent: namespace }
            });
        }

        elements.push({
          data: {
            id: `${hubId}-${podName}`,
            source: hubId,
            target: podName,
            status: status
          }
        });
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
                  'background-color': 'rgba(13, 17, 23, 0.5)',
                  'label': 'data(label)',
                  'color': '#8b949e',
                  'font-size': '10px',
                  'font-family': 'monospace',
                  'font-weight': 'bold',
                  'text-valign': 'top',
                  'text-halign': 'center',
                  'text-margin-y': -10,
                  'border-width': 1,
                  'border-color': '#30363d',
                  'border-opacity': 0.5,
                  'shape': 'round-rectangle',
                  'padding': 20
                }
              },
              {
                selector: 'node[type="hub"]',
                style: {
                  'background-color': '#30363d',
                  'width': 24,
                  'height': 24,
                  'shape': 'hexagon',
                  'border-width': 2,
                  'border-color': '#8b949e',
                  'label': '',
                  'overlay-opacity': 0,
                }
              },
              {
                selector: 'node[type="pod"]',
                style: {
                  'background-color': '#0d1117',
                  'label': 'data(label)',
                  'color': '#c9d1d9',
                  'font-size': '8px',
                  'font-family': 'monospace',
                  'text-valign': 'bottom',
                  'text-halign': 'center',
                  'text-margin-y': 6,
                  'width': 16,
                  'height': 16,
                  'shape': 'ellipse',
                  'border-width': 2,
                  'border-color': 'data(glow)',
                  'shadow-blur': 10,
                  'shadow-color': 'data(glow)',
                  'shadow-opacity': 0.5,
                  'overlay-opacity': 0,
                }
              },
              {
                selector: 'node[status="critical"]',
                style: {
                  'width': 20,
                  'height': 20,
                  'border-width': 3,
                  'shadow-blur': 20,
                }
              },
              {
                selector: 'edge',
                style: {
                  'width': 1.5,
                  'line-color': '#30363d',
                  'curve-style': 'haystack',
                  'haystack-radius': 0,
                  'opacity': 0.4,
                  'overlay-opacity': 0,
                }
              },
              {
                selector: 'edge[status="critical"]',
                style: {
                  'line-color': '#ef4444',
                  'opacity': 0.8,
                  'width': 2,
                }
              },
              {
                selector: 'edge[status="warning"]',
                style: {
                  'line-color': '#f59e0b',
                  'opacity': 0.6,
                }
              }
            ],
            layout: {
              name: 'cose-bilkent',
              animate: true,
              refresh: 10,
              randomize: true,
              nodeRepulsion: 8000,
              idealEdgeLength: 60,
              edgeElasticity: 0.45,
              nestingFactor: 0.1,
              gravity: 0.1,
              numIter: 2500,
              tile: true,
            },
            userZoomingEnabled: true,
            userPanningEnabled: true,
            boxSelectionEnabled: false,
            autoungrabify: false,
          });

          // Pulse animation for pods
          let frame = 0;
          const animate = () => {
              frame++;
              const opacity = 0.4 + Math.sin(frame / 20) * 0.3;
              cyRef.current.nodes('[type="pod"]').style('shadow-opacity', opacity);
              requestAnimationFrame(animate);
          };
          animate();
    };

    if (!cyRef.current) {
      initCy();
    } else {
      cyRef.current.json({ elements });
      cyRef.current.layout({
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 1000,
        randomize: false,
        nodeRepulsion: 8000,
        fit: true,
        padding: 50
      }).run();
    }

  }, [metrics, anomalies]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-[#0d1117] border border-[#30363d] rounded-xl flex flex-col h-full min-h-[480px] shadow-2xl relative overflow-hidden"
    >
      {/* Topology Header */}
      <div className="px-5 py-4 border-b border-[#30363d] flex items-center justify-between bg-[#161b22]/30">
        <div className="flex items-center gap-2">
            <Globe size={14} className="text-cyan-500" />
            <h3 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em]">
                Cluster Topology
            </h3>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
                HEALTHY
            </div>
            <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
                CRITICAL
            </div>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 w-full bg-[#0d1117] relative"
      />
      
      {/* Bottom overlay with info */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
          <div className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-[8px] font-mono text-gray-500 flex items-center gap-1.5">
              <Shield size={10} className="text-emerald-500" />
              mTLS ACTIVE
          </div>
          <div className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-[8px] font-mono text-gray-500 flex items-center gap-1.5">
              <Activity size={10} className="text-cyan-500" />
              BPF INSPECTOR LOADED
          </div>
      </div>

      {/* Grid Pattern Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </motion.div>
  );
}
