import { useEffect, useState, useRef, useCallback } from "react";

export function useWebSocket() {
  const [metrics, setMetrics] = useState({});
  const [anomalies, setAnomalies] = useState([]);
  const [agentStatuses, setAgentStatuses] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000;

  const connect = useCallback(() => {
    try {
      const wsUrl = `ws://${window.location.hostname}:8000/ws/metrics`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log("✓ WebSocket connected");
        setConnectionStatus("connected");
        reconnectAttempts.current = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "snapshot") {
            // Full state snapshot on initial connection
            const data = message.data;
            setMetrics(data.metrics || {});
            setAnomalies(data.anomalies || []);
            setAgentStatuses(data.agent_status || []);
          } else if (message.type === "metrics") {
            // Incremental metrics update
            setMetrics((prev) => ({
              ...prev,
              ...message.data,
            }));
          } else if (message.type === "anomaly") {
            // New anomaly alert
            setAnomalies((prev) => [message.data, ...prev]);
          } else if (message.type === "agent_status") {
            // Agent status update
            setAgentStatuses((prev) => {
              const updated = [...prev];
              const index = updated.findIndex(
                (a) => a.name === message.data.name
              );
              if (index >= 0) {
                updated[index] = message.data;
              }
              return updated;
            });
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.current.onerror = (error) => {
        setConnectionStatus("error");
      };

      ws.current.onclose = () => {
        setConnectionStatus("disconnected");
        // Attempt to reconnect with exponential backoff
        attemptReconnect();
      };
    } catch (err) {
      setConnectionStatus("error");
      attemptReconnect();
    }
  }, []);

  const attemptReconnect = useCallback(() => {
    if (reconnectAttempts.current < maxReconnectAttempts) {
      const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
      reconnectAttempts.current += 1;

      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, delay);
    } else {
      setConnectionStatus("failed");
    }
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    metrics,
    anomalies,
    agentStatuses,
    connectionStatus,
  };
}
