"""
Base agent class for KubeVision AI.
All agents inherit from this abstract base class and implement
the core analyze() and run() methods.
"""

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class AnomalySeverity(str, Enum):
    """Severity levels for detected anomalies."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AgentStatus(str, Enum):
    """Runtime status of an agent."""
    IDLE = "idle"
    RUNNING = "running"
    ALERT = "alert"
    ERROR = "error"


@dataclass
class Anomaly:
    """Represents a detected anomaly."""
    anomaly_type: str
    pod_name: str
    namespace: str
    severity: AnomalySeverity
    description: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metrics: Dict[str, Any] = field(default_factory=dict)
    llm_insight: Optional[str] = None
    agent_name: str = ""
    resolved: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert anomaly to dictionary for JSON serialization."""
        return {
            "anomaly_type": self.anomaly_type,
            "pod_name": self.pod_name,
            "namespace": self.namespace,
            "severity": self.severity.value,
            "description": self.description,
            "timestamp": self.timestamp.isoformat(),
            "metrics": self.metrics,
            "llm_insight": self.llm_insight,
            "agent_name": self.agent_name,
            "resolved": self.resolved,
        }


@dataclass
class AgentResult:
    """Result from an agent run."""
    agent_name: str
    status: AgentStatus
    findings: List[Anomaly] = field(default_factory=list)
    findings_count: int = 0
    duration_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for JSON serialization."""
        return {
            "agent_name": self.agent_name,
            "status": self.status.value,
            "findings_count": self.findings_count,
            "duration_ms": self.duration_ms,
            "timestamp": self.timestamp.isoformat(),
            "error_message": self.error_message,
            "findings": [f.to_dict() for f in self.findings],
        }


class BaseAgent(ABC):
    """
    Abstract base class for all detection agents.
    
    Each agent is responsible for analyzing a specific aspect of the cluster:
    - CPU Agent: CPU spike detection
    - Memory Agent: Memory leak and high usage detection
    - Network Agent: Network traffic anomalies
    - Storage Agent: PVC capacity and I/O stress
    - LogIO Agent: Pod log error rate analysis
    - Scheduling Agent: Pod scheduling failures
    """

    def __init__(self, name: str, description: str):
        """
        Initialize the agent.
        
        Args:
            name: Unique identifier for the agent
            description: Human-readable description of what this agent does
        """
        self.name = name
        self.description = description
        self.status = AgentStatus.IDLE
        self.last_run: Optional[datetime] = None
        self.last_findings_count = 0
        self.error_count = 0
        self.last_error: Optional[str] = None

    @abstractmethod
    async def analyze(self, metrics: Dict[str, Any]) -> List[Anomaly]:
        """
        Analyze metrics and return detected anomalies.
        
        Args:
            metrics: Dictionary of metrics to analyze, typically from Prometheus
        
        Returns:
            List of detected Anomaly objects (can be empty if no anomalies)
            
        Raises:
            Exception: Should be caught by the orchestrator and stored in result.error_message
        """
        pass

    async def run(self, metrics: Optional[Dict[str, Any]] = None) -> AgentResult:
        """
        Execute a full agent run cycle.
        
        This method wraps analyze() with timing, error handling, and status management.
        
        Args:
            metrics: Metrics dictionary. If None, agent should provide mock/cached data.
        
        Returns:
            AgentResult with status, findings, and timing information
        """
        start_time = datetime.utcnow()
        start_ms = asyncio.get_event_loop().time() * 1000

        try:
            self.status = AgentStatus.RUNNING

            # Provide empty dict if no metrics provided
            if metrics is None:
                metrics = {}

            # Run the agent's analysis logic
            findings = await self.analyze(metrics)

            # Determine status based on findings
            if findings:
                severity_levels = [f.severity for f in findings]
                if any(s == AnomalySeverity.CRITICAL for s in severity_levels):
                    self.status = AgentStatus.ALERT
                else:
                    self.status = AgentStatus.RUNNING
            else:
                self.status = AgentStatus.IDLE

            # Update tracking
            self.last_run = start_time
            self.last_findings_count = len(findings)
            self.error_count = 0
            self.last_error = None

            # Calculate duration
            end_ms = asyncio.get_event_loop().time() * 1000
            duration_ms = end_ms - start_ms

            return AgentResult(
                agent_name=self.name,
                status=self.status,
                findings=findings,
                findings_count=len(findings),
                duration_ms=duration_ms,
                timestamp=start_time,
            )

        except Exception as e:
            self.error_count += 1
            self.last_error = str(e)
            self.status = AgentStatus.ERROR

            end_ms = asyncio.get_event_loop().time() * 1000
            duration_ms = end_ms - start_ms

            return AgentResult(
                agent_name=self.name,
                status=AgentStatus.ERROR,
                findings=[],
                findings_count=0,
                duration_ms=duration_ms,
                timestamp=start_time,
                error_message=str(e),
            )

    def get_status(self) -> Dict[str, Any]:
        """
        Return current agent status for the dashboard.
        
        Returns:
            Dictionary with agent metadata and current state
        """
        return {
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "findings_count": self.last_findings_count,
            "error_count": self.error_count,
            "last_error": self.last_error,
        }
