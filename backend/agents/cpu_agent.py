"""
CPU Detection Agent for KubeVision AI.
Detects CPU spikes and sustained high usage across pods.
"""

from typing import Any, Dict, List

from agents.base_agent import Anomaly, AnomalySeverity, BaseAgent


class CPUAgent(BaseAgent):
    """
    Monitors CPU usage and detects anomalies.
    - WARNING: CPU usage > 80% of limit
    - CRITICAL: CPU usage > 95% of limit
    """

    def __init__(self):
        super().__init__(
            name="CPU Agent",
            description="Detects CPU spikes and sustained high usage",
        )
        self.cpu_warning_threshold = 0.80  # 80% of limit
        self.cpu_critical_threshold = 0.95  # 95% of limit

    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        """
        Analyze CPU metrics across all pods and namespaces.

        Expected metrics structure:
        {
            "namespace": {
                "pod_name": {
                    "cpu_usage": float (cores),
                    "cpu_limit": float (cores)
                }
            }
        }

        Args:
            metrics: Metrics dictionary from Prometheus

        Returns:
            List of detected CPU anomalies
        """
        anomalies: List[Anomaly] = []

        # Handle empty or malformed metrics
        if not metrics or not isinstance(metrics, dict):
            return anomalies
            
        pod_metrics = metrics.get("pod_metrics", metrics)

        for namespace, pods in pod_metrics.items():
            if not isinstance(pods, dict):
                continue

            for pod_name, pod_metrics in pods.items():
                if not isinstance(pod_metrics, dict):
                    continue

                try:
                    cpu_usage = float(pod_metrics.get("cpu_usage", 0))
                    cpu_limit = float(pod_metrics.get("cpu_limit", 0))

                    # Skip if no limit is set
                    if cpu_limit <= 0:
                        continue

                    # Calculate percentage of limit
                    cpu_percentage = cpu_usage / cpu_limit

                    # Check for critical threshold
                    if cpu_percentage > self.cpu_critical_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="CPU_CRITICAL",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.CRITICAL,
                                description=(
                                    f"Pod {pod_name} CPU usage is {cpu_percentage*100:.1f}% of limit "
                                    f"({cpu_usage:.3f}/{cpu_limit:.3f} cores)"
                                ),
                                metrics={
                                    "cpu_usage_cores": cpu_usage,
                                    "cpu_limit_cores": cpu_limit,
                                    "cpu_percentage": cpu_percentage * 100,
                                },
                                agent_name=self.name,
                            )
                        )
                    # Check for warning threshold
                    elif cpu_percentage > self.cpu_warning_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="CPU_HIGH",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Pod {pod_name} CPU usage is {cpu_percentage*100:.1f}% of limit "
                                    f"({cpu_usage:.3f}/{cpu_limit:.3f} cores)"
                                ),
                                metrics={
                                    "cpu_usage_cores": cpu_usage,
                                    "cpu_limit_cores": cpu_limit,
                                    "cpu_percentage": cpu_percentage * 100,
                                },
                                agent_name=self.name,
                            )
                        )
                except (ValueError, TypeError) as e:
                    print(f"Error parsing CPU metrics for {namespace}/{pod_name}: {e}")

        return anomalies
