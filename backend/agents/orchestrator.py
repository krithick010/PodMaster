"""
Agent Orchestrator for KubeVision AI.
Manages all 6 agents running in parallel with status tracking and persistence.
"""

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from agents.base_agent import AgentResult, AgentStatus
from agents.cpu_agent import CPUAgent
from agents.logio_agent import LogIOAgent
from agents.memory_agent import MemoryAgent
from agents.network_agent import NetworkAgent
from agents.scheduling_agent import SchedulingAgent
from agents.storage_agent import StorageAgent
from storage.database import KubeVisionDB
from storage.models import AgentRunRecord


class AgentOrchestrator:
    """
    Orchestrates all 6 detection agents.
    Runs them in parallel, tracks their status, and persists results.
    """

    def __init__(self, db: KubeVisionDB):
        """
        Initialize orchestrator with all agents.

        Args:
            db: Database instance for persistence
        """
        self.db = db
        self.agents = [
            CPUAgent(),
            MemoryAgent(),
            NetworkAgent(),
            StorageAgent(),
            LogIOAgent(),
            SchedulingAgent(),
        ]
        self.agent_results: Dict[str, AgentResult] = {}
        self.last_run: Optional[datetime] = None

    async def run_all_agents(self, metrics: Dict[str, Any]) -> Dict[str, AgentResult]:
        """
        Run all agents in parallel and collect results.

        Args:
            metrics: Metrics dictionary from Prometheus and K8s APIs

        Returns:
            Dictionary keyed by agent name with AgentResult objects
        """
        self.last_run = datetime.utcnow()

        # Run all agents concurrently
        tasks = [agent.run(metrics) for agent in self.agents]
        results = await asyncio.gather(*tasks)

        # Store results
        for result in results:
            self.agent_results[result.agent_name] = result

            # Persist to database
            try:
                await self.db.insert_agent_run(
                    AgentRunRecord(
                        timestamp=result.timestamp,
                        agent_name=result.agent_name,
                        status=result.status.value,
                        findings_count=result.findings_count,
                        duration_ms=result.duration_ms,
                        error_message=result.error_message,
                    )
                )
            except Exception as e:
                print(f"Warning: Could not persist agent run for {result.agent_name}: {e}")

        return self.agent_results

    def get_all_findings(self) -> List[Any]:
        """
        Get all anomalies found by all agents in the last run.

        Returns:
            List of Anomaly objects from all agents
        """
        findings = []
        for result in self.agent_results.values():
            findings.extend(result.findings)

        return findings

    def get_agent_statuses(self) -> List[Dict[str, Any]]:
        """
        Get current status of all agents.

        Returns:
            List of agent status dictionaries
        """
        statuses = []
        for agent in self.agents:
            # Use the result if available, otherwise use agent's own status
            if agent.name in self.agent_results:
                result = self.agent_results[agent.name]
                statuses.append({
                    "name": agent.name,
                    "description": agent.description,
                    "status": result.status.value,
                    "last_run": result.timestamp.isoformat() if result.timestamp else None,
                    "findings_count": result.findings_count,
                    "duration_ms": result.duration_ms,
                    "error": result.error_message,
                })
            else:
                statuses.append(agent.get_status())

        return statuses

    def get_status_summary(self) -> Dict[str, Any]:
        """
        Get a summary of all agents' status.

        Returns:
            Summary dict with counts of agents by status
        """
        statuses = self.get_agent_statuses()
        summary = {
            "total_agents": len(statuses),
            "idle_count": sum(1 for s in statuses if s["status"] == AgentStatus.IDLE.value),
            "running_count": sum(1 for s in statuses if s["status"] == AgentStatus.RUNNING.value),
            "alert_count": sum(1 for s in statuses if s["status"] == AgentStatus.ALERT.value),
            "error_count": sum(1 for s in statuses if s["status"] == AgentStatus.ERROR.value),
            "total_findings": sum(s.get("findings_count", 0) for s in statuses),
            "agents": statuses,
            "last_run": self.last_run.isoformat() if self.last_run else None,
        }
        return summary
