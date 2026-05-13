"""
Scheduling Detection Agent for KubeVision AI.
NEW: Detects pod scheduling failures and node pressure issues.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List

from agents.base_agent import Anomaly, AnomalySeverity, BaseAgent


class SchedulingAgent(BaseAgent):
    """
    Monitors pod scheduling and detects failures.
    - WARNING: Pod pending > 60 seconds
    - CRITICAL: Pod pending > 120 seconds
    - CRITICAL: Pod in CrashLoopBackOff or OOMKilled
    - CRITICAL: Pod ImagePullBackOff
    - WARNING: Node pressure (disk, memory) taints detected
    """

    def __init__(self):
        super().__init__(
            name="Scheduling Agent",
            description="Detects pod scheduling failures and node issues",
        )
        self.pending_warning_seconds = 60
        self.pending_critical_seconds = 120

    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        """
        Analyze scheduling metrics and node conditions.

        Expected metrics structure:
        {
            "pending_pods": [
                {
                    "pod_name": str,
                    "namespace": str,
                    "creation_timestamp": datetime,
                    "reason": str
                }
            ],
            "failed_pods": [
                {
                    "pod_name": str,
                    "namespace": str,
                    "reason": str,  # "OOMKilled", "CrashLoopBackOff", "ImagePullBackOff"
                    "message": str
                }
            ],
            "node_pressures": [
                {
                    "node_name": str,
                    "pressure_type": str,  # "MemoryPressure", "DiskPressure"
                    "status": str  # "True" if pressure exists
                }
            ]
        }

        Args:
            metrics: Metrics dictionary with scheduling data

        Returns:
            List of detected scheduling anomalies
        """
        anomalies: List[Anomaly] = []

        # Handle empty or malformed metrics
        if not metrics or not isinstance(metrics, dict):
            return anomalies

        # Check pending pods
        pending_pods = metrics.get("pending_pods", [])
        if isinstance(pending_pods, list):
            for pending_pod in pending_pods:
                try:
                    pod_name = pending_pod.get("pod_name", "unknown")
                    namespace = pending_pod.get("namespace", "unknown")
                    creation_timestamp = pending_pod.get("creation_timestamp")
                    reason = pending_pod.get("reason", "Unknown")

                    # Calculate how long pod has been pending
                    if isinstance(creation_timestamp, datetime):
                        # Make both datetimes timezone-aware
                        now = datetime.utcnow().replace(tzinfo=None)
                        if creation_timestamp.tzinfo is not None:
                            creation_timestamp = creation_timestamp.replace(tzinfo=None)
                        pending_duration = now - creation_timestamp
                        pending_seconds = pending_duration.total_seconds()
                    else:
                        # Try to parse string timestamp
                        try:
                            ts = datetime.fromisoformat(str(creation_timestamp).replace("Z", "+00:00"))
                            ts = ts.replace(tzinfo=None)  # Remove timezone
                            pending_duration = datetime.utcnow() - ts
                            pending_seconds = pending_duration.total_seconds()
                        except Exception:
                            pending_seconds = 0

                    # Check for critical timeout
                    if pending_seconds > self.pending_critical_seconds:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="POD_PENDING_TIMEOUT",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.CRITICAL,
                                description=(
                                    f"Pod {pod_name} has been pending for {pending_seconds:.0f} seconds. "
                                    f"Reason: {reason}. "
                                    f"This indicates a scheduling failure or resource constraint."
                                ),
                                metrics={
                                    "pending_seconds": pending_seconds,
                                    "reason": reason,
                                },
                                agent_name=self.name,
                            )
                        )
                    # Check for warning timeout
                    elif pending_seconds > self.pending_warning_seconds:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="POD_PENDING_SLOW",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Pod {pod_name} has been pending for {pending_seconds:.0f} seconds. "
                                    f"Reason: {reason}."
                                ),
                                metrics={
                                    "pending_seconds": pending_seconds,
                                    "reason": reason,
                                },
                                agent_name=self.name,
                            )
                        )
                except Exception as e:
                    print(f"Error analyzing pending pod {pending_pod.get('pod_name', 'unknown')}: {e}")

        # Check failed pods
        failed_pods = metrics.get("failed_pods", [])
        if isinstance(failed_pods, list):
            for failed_pod in failed_pods:
                try:
                    pod_name = failed_pod.get("pod_name", "unknown")
                    namespace = failed_pod.get("namespace", "unknown")
                    reason = failed_pod.get("reason", "Unknown")
                    message = failed_pod.get("message", "")

                    # All failed pods are critical
                    anomalies.append(
                        Anomaly(
                            anomaly_type="POD_FAILED",
                            pod_name=pod_name,
                            namespace=namespace,
                            severity=AnomalySeverity.CRITICAL,
                            description=(
                                f"Pod {pod_name} failed with reason: {reason}. "
                                f"{message if message else 'No additional details available.'}"
                            ),
                            metrics={
                                "failure_reason": reason,
                                "failure_message": message,
                            },
                            agent_name=self.name,
                        )
                    )
                except Exception as e:
                    print(f"Error analyzing failed pod {failed_pod.get('pod_name', 'unknown')}: {e}")

        # Check node pressures
        node_pressures = metrics.get("node_pressures", [])
        if isinstance(node_pressures, list):
            for pressure in node_pressures:
                try:
                    node_name = pressure.get("node_name", "unknown")
                    pressure_type = pressure.get("pressure_type", "Unknown")
                    status = pressure.get("status", "False")

                    if status == "True":
                        anomalies.append(
                            Anomaly(
                                anomaly_type="NODE_PRESSURE",
                                pod_name="(cluster-wide)",
                                namespace="(cluster-wide)",
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Node {node_name} is experiencing {pressure_type}. "
                                    f"This can prevent pod scheduling."
                                ),
                                metrics={
                                    "node_name": node_name,
                                    "pressure_type": pressure_type,
                                },
                                agent_name=self.name,
                            )
                        )
                except Exception as e:
                    print(f"Error analyzing node pressure: {e}")

        return anomalies
