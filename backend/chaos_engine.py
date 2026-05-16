"""
Chaos Engine for KubeVision AI.
Injects controlled anomalies for testing and demos.
"""

import asyncio
import random
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from agents.base_agent import Anomaly, AnomalySeverity


class ChaosEngine:
    """
    Injects controlled anomalies into the system for demos and testing.
    Automatically recovers anomalies after a timeout.
    """

    def __init__(self, auto_recover_seconds: int = 90):
        """
        Initialize chaos engine.

        Args:
            auto_recover_seconds: How long before injected anomalies auto-recover
        """
        self.auto_recover_seconds = auto_recover_seconds
        self.injected_anomalies: List[Dict[str, Any]] = []
        self.enabled = False

    def enable(self) -> None:
        """Enable chaos engine."""
        self.enabled = True

    def disable(self) -> None:
        """Disable chaos engine."""
        self.enabled = False
        self.injected_anomalies.clear()

    def inject_cpu_spike(self, pod_name: str, namespace: str, percentage: float = 95.0) -> Anomaly:
        """
        Inject a CPU spike anomaly.

        Args:
            pod_name: Pod to target
            namespace: Pod namespace
            percentage: CPU percentage to simulate

        Returns:
            Injected Anomaly object
        """
        anomaly = Anomaly(
            anomaly_type="CPU_CRITICAL",
            pod_name=pod_name,
            namespace=namespace,
            severity=AnomalySeverity.CRITICAL,
            description=f"[INJECTED] Pod {pod_name} CPU usage spiked to {percentage}%",
            metrics={"cpu_percentage": percentage},
            agent_name="ChaosEngine",
        )

        self.injected_anomalies.append({
            "anomaly": anomaly,
            "created_at": datetime.utcnow(),
            "auto_recover_at": datetime.utcnow() + timedelta(seconds=self.auto_recover_seconds),
        })

        return anomaly

    def inject_memory_leak(self, pod_name: str, namespace: str, percentage: float = 92.0) -> Anomaly:
        """
        Inject a memory leak anomaly.

        Args:
            pod_name: Pod to target
            namespace: Pod namespace
            percentage: Memory percentage to simulate

        Returns:
            Injected Anomaly object
        """
        anomaly = Anomaly(
            anomaly_type="MEMORY_CRITICAL",
            pod_name=pod_name,
            namespace=namespace,
            severity=AnomalySeverity.CRITICAL,
            description=f"[INJECTED] Pod {pod_name} memory usage at {percentage}% (potential leak)",
            metrics={"memory_percentage": percentage},
            agent_name="ChaosEngine",
        )

        self.injected_anomalies.append({
            "anomaly": anomaly,
            "created_at": datetime.utcnow(),
            "auto_recover_at": datetime.utcnow() + timedelta(seconds=self.auto_recover_seconds),
        })

        return anomaly

    def inject_storage_pressure(self, pod_name: str, namespace: str, pvc_name: str, percentage: float = 92.0) -> Anomaly:
        """
        Inject storage pressure anomaly.

        Args:
            pod_name: Pod to target
            namespace: Pod namespace
            pvc_name: PVC name
            percentage: Storage percentage to simulate

        Returns:
            Injected Anomaly object
        """
        anomaly = Anomaly(
            anomaly_type="STORAGE_CRITICAL",
            pod_name=pod_name,
            namespace=namespace,
            severity=AnomalySeverity.CRITICAL,
            description=f"[INJECTED] PVC {pvc_name} for {pod_name} is {percentage}% full",
            metrics={"pvc_name": pvc_name, "usage_percentage": percentage},
            agent_name="ChaosEngine",
        )

        self.injected_anomalies.append({
            "anomaly": anomaly,
            "created_at": datetime.utcnow(),
            "auto_recover_at": datetime.utcnow() + timedelta(seconds=self.auto_recover_seconds),
        })

        return anomaly

    def inject_log_flood(self, pod_name: str, namespace: str, error_rate: float = 3.0) -> Anomaly:
        """
        Inject log error flood anomaly.

        Args:
            pod_name: Pod to target
            namespace: Pod namespace
            error_rate: Errors per second to simulate

        Returns:
            Injected Anomaly object
        """
        anomaly = Anomaly(
            anomaly_type="LOG_ERROR_SPIKE",
            pod_name=pod_name,
            namespace=namespace,
            severity=AnomalySeverity.CRITICAL,
            description=f"[INJECTED] Pod {pod_name} error rate: {error_rate:.1f} errors/sec",
            metrics={"error_rate_per_sec": error_rate},
            agent_name="ChaosEngine",
        )

        self.injected_anomalies.append({
            "anomaly": anomaly,
            "created_at": datetime.utcnow(),
            "auto_recover_at": datetime.utcnow() + timedelta(seconds=self.auto_recover_seconds),
        })

        return anomaly

    def inject_network_spike(self, pod_name: str, namespace: str, mb_per_sec: float = 100.0) -> Anomaly:
        """
        Inject network traffic spike anomaly.

        Args:
            pod_name: Pod to target
            namespace: Pod namespace
            mb_per_sec: Network traffic in MB/s to simulate

        Returns:
            Injected Anomaly object
        """
        anomaly = Anomaly(
            anomaly_type="NETWORK_CRITICAL_OUT",
            pod_name=pod_name,
            namespace=namespace,
            severity=AnomalySeverity.CRITICAL,
            description=f"[INJECTED] Pod {pod_name} network spike: {mb_per_sec:.1f} MB/s",
            metrics={"network_mb_per_sec": mb_per_sec},
            agent_name="ChaosEngine",
        )

        self.injected_anomalies.append({
            "anomaly": anomaly,
            "created_at": datetime.utcnow(),
            "auto_recover_at": datetime.utcnow() + timedelta(seconds=self.auto_recover_seconds),
        })

        return anomaly

    def inject_random(self, namespaces: List[str], pod_names: List[str]) -> Optional[Anomaly]:
        """
        Inject a random anomaly type.

        Args:
            namespaces: Available namespaces
            pod_names: Available pod names

        Returns:
            Injected Anomaly or None if no pods available
        """
        if not namespaces or not pod_names:
            return None

        namespace = random.choice(namespaces)
        pod_name = random.choice(pod_names)
        anomaly_type = random.choice([
            "cpu_spike",
            "memory_leak",
            "storage_pressure",
            "log_flood",
            "network_spike",
        ])

        if anomaly_type == "cpu_spike":
            return self.inject_cpu_spike(pod_name, namespace, percentage=random.uniform(85, 99))
        elif anomaly_type == "memory_leak":
            return self.inject_memory_leak(pod_name, namespace, percentage=random.uniform(80, 98))
        elif anomaly_type == "storage_pressure":
            return self.inject_storage_pressure(
                pod_name,
                namespace,
                f"pvc-{pod_name}",
                percentage=random.uniform(85, 95),
            )
        elif anomaly_type == "log_flood":
            return self.inject_log_flood(pod_name, namespace, error_rate=random.uniform(2, 5))
        else:  # network_spike
            return self.inject_network_spike(pod_name, namespace, mb_per_sec=random.uniform(50, 150))

    def get_active_anomalies(self) -> List[Anomaly]:
        """
        Get currently active injected anomalies.

        Returns:
            List of active Anomaly objects
        """
        now = datetime.utcnow()
        active = []

        for item in self.injected_anomalies:
            if now < item["auto_recover_at"]:
                active.append(item["anomaly"])

        return active

    def cleanup_expired(self) -> int:
        """
        Remove expired injected anomalies.

        Returns:
            Number of anomalies cleaned up
        """
        now = datetime.utcnow()
        before_count = len(self.injected_anomalies)
        self.injected_anomalies = [
            item for item in self.injected_anomalies
            if now < item["auto_recover_at"]
        ]
        return before_count - len(self.injected_anomalies)

    def get_status(self) -> Dict[str, Any]:
        """
        Get chaos engine status.

        Returns:
            Status dict with enabled flag and active anomaly count
        """
        self.cleanup_expired()
        return {
            "enabled": self.enabled,
            "active_injections": len(self.get_active_anomalies()),
            "auto_recover_seconds": self.auto_recover_seconds,
        }
