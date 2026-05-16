"""
Data models for KubeVision AI / PodMaster.
Used for SQLite persistence and API responses.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class AnomalyRecord:
    """Model for persistent anomaly record in SQLite."""
    id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    namespace: str = ""
    pod_name: str = ""
    agent_name: str = ""
    anomaly_type: str = ""
    severity: str = ""  # "info", "warning", "critical"
    description: str = ""
    llm_insight: Optional[str] = None
    metrics_json: Optional[str] = None  # JSON string of metrics dict
    resolved: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "namespace": self.namespace,
            "pod_name": self.pod_name,
            "agent_name": self.agent_name,
            "anomaly_type": self.anomaly_type,
            "severity": self.severity,
            "description": self.description,
            "llm_insight": self.llm_insight,
            "resolved": self.resolved,
        }


@dataclass
class AgentRunRecord:
    """Model for persistent agent run record in SQLite."""
    id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    agent_name: str = ""
    status: str = ""  # "idle", "running", "alert", "error"
    findings_count: int = 0
    duration_ms: float = 0.0
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "agent_name": self.agent_name,
            "status": self.status,
            "findings_count": self.findings_count,
            "duration_ms": self.duration_ms,
            "error_message": self.error_message,
        }


@dataclass
class MetricsSnapshotRecord:
    """Model for metric snapshots in SQLite (for trending)."""
    id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    namespace: str = ""
    pod_name: str = ""
    cpu_usage: float = 0.0
    cpu_limit: float = 0.0
    memory_usage: float = 0.0
    memory_limit: float = 0.0
    restart_count: int = 0
    error_rate: float = 0.0  # errors per second
    network_in_bytes: float = 0.0
    network_out_bytes: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "namespace": self.namespace,
            "pod_name": self.pod_name,
            "cpu_usage": self.cpu_usage,
            "cpu_limit": self.cpu_limit,
            "memory_usage": self.memory_usage,
            "memory_limit": self.memory_limit,
            "restart_count": self.restart_count,
            "error_rate": self.error_rate,
            "network_in_bytes": self.network_in_bytes,
            "network_out_bytes": self.network_out_bytes,
        }


@dataclass
class StorageMetricsRecord:
    """Model for PVC/storage metrics in SQLite."""
    id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    namespace: str = ""
    pod_name: str = ""
    pvc_name: str = ""
    mount_path: str = ""
    capacity_bytes: float = 0.0
    used_bytes: float = 0.0
    available_bytes: float = 0.0
    usage_percentage: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "namespace": self.namespace,
            "pod_name": self.pod_name,
            "pvc_name": self.pvc_name,
            "mount_path": self.mount_path,
            "capacity_bytes": self.capacity_bytes,
            "used_bytes": self.used_bytes,
            "available_bytes": self.available_bytes,
            "usage_percentage": self.usage_percentage,
        }


@dataclass
class ClusterSummaryRecord:
    """Model for cluster health summary synthesis."""
    id: Optional[int] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    health_score: float = 100.0
    critical_findings: int = 0
    llm_summary: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "health_score": self.health_score,
            "critical_findings": self.critical_findings,
            "llm_summary": self.llm_summary,
        }


@dataclass
class RCARecord:
    """Model for Root Cause Analysis (RCA) records."""
    id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    primary_service: str = ""
    symptoms: str = ""
    suspected_root_cause: str = ""
    status: str = "active"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "primary_service": self.primary_service,
            "symptoms": self.symptoms,
            "suspected_root_cause": self.suspected_root_cause,
            "status": self.status,
        }


@dataclass
class SLORecord:
    """Model for Service Level Objectives (SLOs)."""
    id: Optional[str] = None
    service: str = ""
    objective_percentage: float = 99.9
    current_availability: float = 100.0
    budget_remaining: float = 100.0
    status: str = "on_track"  # on_track, at_risk, breached

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "service": self.service,
            "objective_percentage": self.objective_percentage,
            "current_availability": self.current_availability,
            "budget_remaining": self.budget_remaining,
            "status": self.status,
        }


@dataclass
class AlertRuleRecord:
    """Model for threshold-based alert rules."""
    id: Optional[str] = None
    name: str = ""
    service: str = "all"
    condition_json: str = "{}"
    status: str = "active"  # active, triggered, muted
    last_triggered_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "service": self.service,
            "condition_json": self.condition_json,
            "status": self.status,
            "last_triggered_at": self.last_triggered_at,
        }


@dataclass
class ConfigEventRecord:
    """Model for configuration changes and deployment events."""
    id: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    service: str = ""
    event_type: str = "deploy"  # deploy, scale, config_change
    description: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else self.timestamp,
            "service": self.service,
            "event_type": self.event_type,
            "description": self.description,
        }
