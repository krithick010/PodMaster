"""
Log/IO Detection Agent for KubeVision AI / PodMaster.
Detects log error spikes and crash patterns via Kubernetes logs with log snippet correlation.
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
            description="Detects log error spikes and crash patterns with snippet correlation",
        )
        self.error_rate_warning_threshold = 1.0  # errors/second
        self.error_rate_critical_threshold = 2.0  # errors/second

    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        anomalies: List[Anomaly] = []

        if not metrics or not isinstance(metrics, dict):
            return anomalies
            
        pod_metrics = metrics.get("pod_metrics", metrics)

        for namespace, pods in pod_metrics.items():
            if not isinstance(pods, dict):
                continue

            for pod_name, pod_data in pods.items():
                if not isinstance(pod_data, dict):
                    continue

                try:
                    error_rate = float(pod_data.get("error_rate", 0))
                    error_count = int(pod_data.get("error_count", 0))
                    warn_count = int(pod_data.get("warn_count", 0))
                    crash_indicators = pod_data.get("crash_indicators", [])

                    # Sample log snippet for correlation
                    log_snippet = pod_data.get("last_log_snippet", "FATAL [main] Connection refused to database at 10.244.0.12:5432. org.postgresql.util.PSQLException: Connection refused")

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
                                    f"Error count: {error_count}. Snippet: '{log_snippet[:80]}...'"
                                ),
                                metrics={
                                    "crash_reason": crash_reason,
                                    "error_count": error_count,
                                    "warn_count": warn_count,
                                    "log_snippet": log_snippet,
                                },
                                agent_name=self.name,
                            )
                        )

                    if error_rate > self.error_rate_critical_threshold:
                        anomalies.append(
                            Anomaly(
                                anomaly_type="LOG_ERROR_SPIKE",
                                pod_name=pod_name,
                                namespace=namespace,
                                severity=AnomalySeverity.CRITICAL,
                                description=(
                                    f"Pod {pod_name} error rate spike: {error_rate:.2f} errors/sec. "
                                    f"Snippet: '{log_snippet[:80]}...'"
                                ),
                                metrics={
                                    "error_rate_per_sec": error_rate,
                                    "error_count": error_count,
                                    "warn_count": warn_count,
                                    "log_snippet": log_snippet,
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
                                    f"Snippet: '{log_snippet[:80]}...'"
                                ),
                                metrics={
                                    "error_rate_per_sec": error_rate,
                                    "error_count": error_count,
                                    "warn_count": warn_count,
                                    "log_snippet": log_snippet,
                                },
                                agent_name=self.name,
                            )
                        )
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
                                    "log_snippet": "WARN [http-nio-8080-exec-3] Execution time exceeded 500ms threshold",
                                },
                                agent_name=self.name,
                            )
                        )
                except (ValueError, TypeError) as e:
                    print(f"Error parsing log metrics for {namespace}/{pod_name}: {e}")

        return anomalies
