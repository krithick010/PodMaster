"""
Log/IO Detection Agent for KubeVision AI.
NEW: Detects log error spikes and crash patterns via Kubernetes logs.
"""

from typing import Any, Dict, List

from agents.base_agent import Anomaly, AnomalySeverity, BaseAgent


class LogIOAgent(BaseAgent):
    """
    Monitors pod logs for error patterns and detects anomalies.
    - WARNING: Error rate > 1.0 errors/second
    - CRITICAL: Error rate > 2.0 errors/second
    - CRITICAL: CrashLoopBackOff or OOMKilled patterns detected
    """

    def __init__(self):
        super().__init__(
            name="LogIO Agent",
            description="Detects log error spikes and crash patterns",
        )
        self.error_rate_warning_threshold = 1.0  # errors/second
        self.error_rate_critical_threshold = 2.0  # errors/second

    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        """
        Analyze log metrics across pods.

        Expected metrics structure:
        {
            "namespace": {
                "pod_name": {
                    "error_rate": float (errors/second),
                    "error_count": int,
                    "warn_count": int,
                    "crash_indicators": [str]  # ["OOMKilled", "CrashLoopBackOff", etc]
                }
            }
        }

        Args:
            metrics: Metrics dictionary with log analysis data

        Returns:
            List of detected log/IO anomalies
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
                    error_rate = float(pod_metrics.get("error_rate", 0))
                    error_count = int(pod_metrics.get("error_count", 0))
                    warn_count = int(pod_metrics.get("warn_count", 0))
                    crash_indicators = pod_metrics.get("crash_indicators", [])

                    # Check for crash indicators first (highest priority)
                    if crash_indicators:
                        crash_reason = crash_indicators[0] if isinstance(crash_indicators, list) else str(crash_indicators)
                        severity = AnomalySeverity.CRITICAL if crash_reason in ["OOMKilled", "CrashLoopBackOff"] else AnomalySeverity.WARNING

                        anomalies.append(
                            Anomaly(
                                anomaly_type="POD_CRASH_DETECTED",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=severity,
                                description=(
                                    f"Pod {pod_name} shows crash indicators: {crash_reason}. "
                                    f"Error count: {error_count}, Warning count: {warn_count}"
                                ),
                                metrics={
                                    "crash_reason": crash_reason,
                                    "error_count": error_count,
                                    "warn_count": warn_count,
                                },
                                agent_name=self.name,
                            )
                        )

                    # Check for error rate spikes
                    if error_rate > self.error_rate_critical_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="LOG_ERROR_SPIKE",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.CRITICAL,
                                description=(
                                    f"Pod {pod_name} error rate spike: {error_rate:.2f} errors/sec. "
                                    f"Total errors in period: {error_count}"
                                ),
                                metrics={
                                    "error_rate_per_sec": error_rate,
                                    "error_count": error_count,
                                    "warn_count": warn_count,
                                },
                                agent_name=self.name,
                            )
                        )
                    elif error_rate > self.error_rate_warning_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="LOG_ERROR_ELEVATED",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Pod {pod_name} elevated error rate: {error_rate:.2f} errors/sec. "
                                    f"Total errors in period: {error_count}"
                                ),
                                metrics={
                                    "error_rate_per_sec": error_rate,
                                    "error_count": error_count,
                                    "warn_count": warn_count,
                                },
                                agent_name=self.name,
                            )
                        )
                    # Check if just warnings are elevated
                    elif warn_count > 10:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="LOG_WARNINGS_ELEVATED",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.WARNING,
                                description=(
                                    f"Pod {pod_name} has elevated warnings: {warn_count} warnings detected. "
                                    f"Errors: {error_count}"
                                ),
                                metrics={
                                    "error_count": error_count,
                                    "warn_count": warn_count,
                                    "error_rate_per_sec": error_rate,
                                },
                                agent_name=self.name,
                            )
                        )
                except (ValueError, TypeError) as e:
                    print(f"Error parsing log metrics for {namespace}/{pod_name}: {e}")

        return anomalies
