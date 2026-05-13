import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import { motion } from "framer-motion";

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
      // Add namespace node
      elements.push({
        data: { id: namespace, label: namespace, type: 'namespace' }
      });

      // Add pod nodes
      const pods = metrics[namespace];
      Object.keys(pods).forEach((podName) => {
        // Check if this pod has an anomaly
        const podAnomalies = anomalies.filter(a => a.pod_name === podName);
        let status = 'healthy';
        if (podAnomalies.some(a => a.severity === 'critical')) {
          status = 'critical';
        } else if (podAnomalies.some(a => a.severity === 'warning')) {
          status = 'warning';
        }

        elements.push({
          data: { 
            id: podName, 
            label: podName.substring(0, 15) + (podName.length > 15 ? '...' : ''), 
            fullName: podName,
            type: 'pod',
            status: status
          }
        });

        // Add edge from namespace to pod
        elements.push({
          data: {
            id: `${namespace}-${podName}`,
            source: namespace,
            target: podName
          }
        });
      });
    });

    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements: elements,
        style: [
          {
            selector: 'node[type="namespace"]',
            style: {
              'background-color': '#1f2937', // bg-gray-800
              'label': 'data(label)',
              'color': '#9ca3af', // text-gray-400
              'font-size': '12px',
              'font-family': 'monospace',
              'text-valign': 'top',
              'text-halign': 'center',
              'width': 60,
              'height': 60,
              'border-width': 2,
              'border-color': '#374151' // border-gray-700
            }
          },
          {
            selector: 'node[type="pod"]',
            style: {
              'background-color': '#10b981', // green for healthy
              'label': 'data(label)',
              'color': '#d1d5db',
              'font-size': '10px',
              'font-family': 'monospace',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'text-margin-y': 4,
              'width': 30,
              'height': 30,
              'shape': 'round-rectangle'
            }
          },
          {
            selector: 'node[status="warning"]',
            style: {
              'background-color': '#f59e0b', // amber
              'border-width': 2,
              'border-color': '#d97706'
            }
          },
          {
            selector: 'node[status="critical"]',
            style: {
              'background-color': '#ef4444', // red
              'border-width': 2,
              'border-color': '#b91c1c'
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': '#374151',
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#374151',
              'arrow-scale': 0.8
            }
          }
        ],
        layout: {
          name: 'cose-bilkent',
          animate: false,
          nodeRepulsion: 4500,
          idealEdgeLength: 100,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          gravity: 0.2,
          numIter: 2500,
        },
        userZoomingEnabled: false,
        userPanningEnabled: true,
      });

      // Add tooltip logic
      cyRef.current.on('tap', 'node[type="pod"]', function(evt){
        const node = evt.target;
        console.log('Tapped ' + node.data('fullName'));
      });
    } else {
      // Update existing graph
      cyRef.current.elements().remove();
      cyRef.current.add(elements);
      cyRef.current.layout({
        name: 'cose-bilkent',
        animate: true,
        animationDuration: 500,
        randomize: false,
        nodeRepulsion: 4500,
        idealEdgeLength: 100,
      }).run();
    }

  }, [metrics, anomalies]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="bg-elevated border-subtle rounded-lg p-6 flex flex-col h-full min-h-[400px]"
    >
      <h3 className="text-xs font-mono font-600 text-text-secondary mb-3 uppercase">
        Live Cluster Topology
      </h3>
      <div 
        ref={containerRef} 
        className="flex-1 w-full h-full rounded-md border border-subtle bg-base overflow-hidden" 
        style={{ minHeight: "350px" }}
      />
      <div className="flex gap-4 mt-4 justify-center text-xs text-text-muted font-mono">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Healthy
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-500 rounded-sm"></div> Warning
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-sm"></div> Critical
        </div>
      </div>
    </motion.div>
  );
}
