"""
Network Detection Agent for KubeVision AI.
Detects network traffic anomalies and unusual traffic patterns.
"""

from typing import Any, Dict, List

from agents.base_agent import Anomaly, AnomalySeverity, BaseAgent


class NetworkAgent(BaseAgent):
    """
    Monitors network traffic and detects anomalies.
    - WARNING: Network traffic spike > 10MB/s
    - CRITICAL: Network traffic spike > 50MB/s
    - INFO: Connection errors detected
    """

    def __init__(self):
        super().__init__(
            name="Network Agent",
            description="Detects network traffic anomalies",
        )
        self.network_warning_threshold = 10 * 1024 * 1024  # 10 MB/s
        self.network_critical_threshold = 50 * 1024 * 1024  # 50 MB/s

    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        """
        Analyze network metrics across all pods and namespaces.

        Expected metrics structure:
        {
            "namespace": {
                "pod_name": {
                    "network_in": float (bytes/sec),
                    "network_out": float (bytes/sec)
                }
            }
        }

        Args:
            metrics: Metrics dictionary from Prometheus

        Returns:
            List of detected network anomalies
        """
        anomalies: List[Anomaly] = []

        # Handle empty or malformed metrics
        if not metrics or not isinstance(metrics, dict):
            return anomalies

        for namespace, pods in metrics.items():
            if not isinstance(pods, dict):
                continue

            for pod_name, pod_metrics in pods.items():
                if not isinstance(pod_metrics, dict):
                    continue

                try:
                    network_in = float(pod_metrics.get("network_in", 0))
                    network_out = float(pod_metrics.get("network_out", 0))

                    # Convert to MB/s for display
                    network_in_mb_s = network_in / (1024 ** 2)
                    network_out_mb_s = network_out / (1024 ** 2)
                    total_traffic = network_in + network_out

                    # Check for critical inbound traffic
                    if network_in > self.network_critical_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="NETWORK_CRITICAL_IN",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.CRITICAL,
                                description=(
                                    f"Pod {pod_name} inbound traffic spike: {network_in_mb_s:.1f} MB/s"
                                ),
                                metrics={
                                    "network_in_mb_s": network_in_mb_s,
                                    "network_out_mb_s": network_out_mb_s,
                                },
                                agent_name=self.name,
                            )
                        )
                    # Check for warning inbound traffic
                    elif network_in > self.network_warning_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="NETWORK_HIGH_IN",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Pod {pod_name} elevated inbound traffic: {network_in_mb_s:.1f} MB/s"
                                ),
                                metrics={
                                    "network_in_mb_s": network_in_mb_s,
                                    "network_out_mb_s": network_out_mb_s,
                                },
                                agent_name=self.name,
                            )
                        )

                    # Check for critical outbound traffic
                    if network_out > self.network_critical_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="NETWORK_CRITICAL_OUT",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.CRITICAL,
                                description=(
                                    f"Pod {pod_name} outbound traffic spike: {network_out_mb_s:.1f} MB/s"
                                ),
                                metrics={
                                    "network_in_mb_s": network_in_mb_s,
                                    "network_out_mb_s": network_out_mb_s,
                                },
                                agent_name=self.name,
                            )
                        )
                    # Check for warning outbound traffic
                    elif network_out > self.network_warning_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="NETWORK_HIGH_OUT",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Pod {pod_name} elevated outbound traffic: {network_out_mb_s:.1f} MB/s"
                                ),
                                metrics={
                                    "network_in_mb_s": network_in_mb_s,
                                    "network_out_mb_s": network_out_mb_s,
                                },
                                agent_name=self.name,
                            )
                        )
                except (ValueError, TypeError) as e:
                    print(f"Error parsing network metrics for {namespace}/{pod_name}: {e}")

        return anomalies
