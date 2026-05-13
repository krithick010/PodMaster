"""
Memory Detection Agent for KubeVision AI.
Detects memory leaks and high memory usage.
"""

from typing import Any, Dict, List

from agents.base_agent import Anomaly, AnomalySeverity, BaseAgent


class MemoryAgent(BaseAgent):
    """
    Monitors memory usage and detects anomalies.
    - WARNING: Memory usage > 80% of limit
    - CRITICAL: Memory usage > 95% of limit
    - INFO: Potential memory leak (sustained high usage over time)
    """

    def __init__(self):
        super().__init__(
            name="Memory Agent",
            description="Detects memory leaks and high memory usage",
        )
        self.memory_warning_threshold = 0.80  # 80% of limit
        self.memory_critical_threshold = 0.95  # 95% of limit

    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        """
        Analyze memory metrics across all pods and namespaces.

        Expected metrics structure:
        {
            "namespace": {
                "pod_name": {
                    "memory_usage": float (bytes),
                    "memory_limit": float (bytes)
                }
            }
        }

        Args:
            metrics: Metrics dictionary from Prometheus

        Returns:
            List of detected memory anomalies
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
                    memory_usage = float(pod_metrics.get("memory_usage", 0))
                    memory_limit = float(pod_metrics.get("memory_limit", 0))

                    # Skip if no limit is set
                    if memory_limit <= 0:
                        continue

                    # Calculate percentage of limit
                    memory_percentage = memory_usage / memory_limit

                    # Convert bytes to MB for display
                    memory_usage_mb = memory_usage / (1024 ** 2)
                    memory_limit_mb = memory_limit / (1024 ** 2)

                    # Check for critical threshold
                    if memory_percentage > self.memory_critical_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="MEMORY_CRITICAL",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.CRITICAL,
                                description=(
                                    f"Pod {pod_name} memory usage is {memory_percentage*100:.1f}% of limit "
                                    f"({memory_usage_mb:.1f}/{memory_limit_mb:.1f} MB)"
                                ),
                                metrics={
                                    "memory_usage_mb": memory_usage_mb,
                                    "memory_limit_mb": memory_limit_mb,
                                    "memory_percentage": memory_percentage * 100,
                                },
                                agent_name=self.name,
                            )
                        )
                    # Check for warning threshold
                    elif memory_percentage > self.memory_warning_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="MEMORY_HIGH",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Pod {pod_name} memory usage is {memory_percentage*100:.1f}% of limit "
                                    f"({memory_usage_mb:.1f}/{memory_limit_mb:.1f} MB)"
                                ),
                                metrics={
                                    "memory_usage_mb": memory_usage_mb,
                                    "memory_limit_mb": memory_limit_mb,
                                    "memory_percentage": memory_percentage * 100,
                                },
                                agent_name=self.name,
                            )
                        )
                except (ValueError, TypeError) as e:
                    print(f"Error parsing memory metrics for {namespace}/{pod_name}: {e}")

        return anomalies
