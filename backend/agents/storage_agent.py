"""
Storage/PVC Detection Agent for KubeVision AI.
NEW: Detects PVC storage pressure and I/O stress.
Correlates PVC usage with pod restart counts.
"""

from typing import Any, Dict, List

from agents.base_agent import Anomaly, AnomalySeverity, BaseAgent


class StorageAgent(BaseAgent):
    """
    Monitors PVC usage and detects storage pressure.
    - WARNING: PVC usage > 80% of capacity
    - CRITICAL: PVC usage > 90% of capacity
    - CRITICAL: PVC usage >85% AND pod restart_count > 3 (storage/I/O stress correlation)
    """

    def __init__(self):
        super().__init__(
            name="Storage Agent",
            description="Detects PVC storage pressure and I/O stress",
        )
        self.storage_warning_threshold = 0.80  # 80% of capacity
        self.storage_critical_threshold = 0.90  # 90% of capacity
        self.storage_restart_correlation_threshold = 0.85  # 85% usage with restart correlation

    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        """
        Analyze storage metrics across all PVCs and correlate with pod restarts.

        Expected metrics structure:
        {
            "pvc_namespace/pvc_name": {
                "pvc_name": str,
                "namespace": str,
                "pod_name": str,
                "capacity_bytes": float,
                "used_bytes": float,
                "usage_percentage": float
            }
        }

        Also expects pod metrics for restart correlation:
        {
            "namespace": {
                "pod_name": {
                    "restart_count": int
                }
            }
        }

        Args:
            metrics: Metrics dictionary with both PVC and pod metrics

        Returns:
            List of detected storage anomalies
        """
        anomalies: List[Anomaly] = []

        # Handle empty or malformed metrics
        if not metrics or not isinstance(metrics, dict):
            return anomalies

        # Split metrics: PVC metrics are in "pvc_metrics" key, pod metrics in "pod_metrics"
        pvc_metrics = metrics.get("pvc_metrics", {})
        pod_metrics = metrics.get("pod_metrics", {})

        # If legacy format with no keys, treat entire dict as PVC metrics
        if not pvc_metrics and any("pvc_name" in str(v) for v in metrics.values() if isinstance(v, dict)):
            pvc_metrics = metrics

        for pvc_key, pvc_data in pvc_metrics.items():
            if not isinstance(pvc_data, dict):
                continue

            try:
                pvc_name = pvc_data.get("pvc_name", "unknown")
                namespace = pvc_data.get("namespace", "unknown")
                pod_name = pvc_data.get("pod_name", "unknown")
                capacity_bytes = float(pvc_data.get("capacity_bytes", 0))
                used_bytes = float(pvc_data.get("used_bytes", 0))

                # Skip if capacity is zero or not set
                if capacity_bytes <= 0:
                    continue

                # Calculate percentage of capacity
                usage_percentage = used_bytes / capacity_bytes

                # Get restart count for correlation
                restart_count = 0
                if namespace in pod_metrics and isinstance(pod_metrics[namespace], dict):
                    if pod_name in pod_metrics[namespace]:
                        restart_count = int(pod_metrics[namespace][pod_name].get("restart_count", 0))

                # Convert bytes to GB for display
                used_gb = used_bytes / (1024 ** 3)
                capacity_gb = capacity_bytes / (1024 ** 3)

                # Check for storage/restart correlation
                if usage_percentage > self.storage_restart_correlation_threshold and restart_count > 3:
                    anomalies.append(
                        Anomaly(
                            anomaly_type="PVC_RESTART_CORRELATION",
                            pod_name=pod_name,
                            namespace=namespace,
                            severity=AnomalySeverity.CRITICAL,
                            description=(
                                f"PVC {pvc_name} at {usage_percentage*100:.1f}% capacity ({used_gb:.2f}/{capacity_gb:.2f} GB) "
                                f"correlated with pod restart count: {restart_count}. "
                                f"Likely I/O stress or storage-induced failures."
                            ),
                            metrics={
                                "pvc_name": pvc_name,
                                "used_gb": used_gb,
                                "capacity_gb": capacity_gb,
                                "usage_percentage": usage_percentage * 100,
                                "restart_count": restart_count,
                            },
                            agent_name=self.name,
                        )
                    )
                # Check for critical threshold
                elif usage_percentage > self.storage_critical_threshold:
                    anomalies.append(
                        Anomaly(
                            anomaly_type="STORAGE_CRITICAL",
                            pod_name=pod_name,
                            namespace=namespace,
                            severity=AnomalySeverity.CRITICAL,
                            description=(
                                f"PVC {pvc_name} is {usage_percentage*100:.1f}% full "
                                f"({used_gb:.2f}/{capacity_gb:.2f} GB). "
                                f"Critical storage pressure detected."
                            ),
                            metrics={
                                "pvc_name": pvc_name,
                                "used_gb": used_gb,
                                "capacity_gb": capacity_gb,
                                "usage_percentage": usage_percentage * 100,
                            },
                            agent_name=self.name,
                        )
                    )
                # Check for warning threshold
                elif usage_percentage > self.storage_warning_threshold:
                    anomalies.append(
                        Anomaly(
                            anomaly_type="STORAGE_PRESSURE",
                            pod_name=pod_name,
                            namespace=namespace,
                            severity=AnomalySeverity.WARNING,
                            description=(
                                f"PVC {pvc_name} is {usage_percentage*100:.1f}% full "
                                f"({used_gb:.2f}/{capacity_gb:.2f} GB). "
                                f"Storage pressure warning."
                            ),
                            metrics={
                                "pvc_name": pvc_name,
                                "used_gb": used_gb,
                                "capacity_gb": capacity_gb,
                                "usage_percentage": usage_percentage * 100,
                            },
                            agent_name=self.name,
                        )
                    )
            except (ValueError, TypeError) as e:
                print(f"Error parsing storage metrics for {pvc_key}: {e}")

        return anomalies
