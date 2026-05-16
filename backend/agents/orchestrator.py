"""
Agent Orchestrator for KubeVision AI / PodMaster.
Manages all 6 agents running in parallel with status tracking, persistence, and automated RCA triggering.
"""

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from agents.base_agent import AgentResult, AgentStatus, BaseAgent
from agents.cpu_agent import CPUAgent
from agents.logio_agent import LogIOAgent
from agents.memory_agent import MemoryAgent
from agents.network_agent import NetworkAgent
from agents.scheduling_agent import SchedulingAgent
from agents.storage_agent import StorageAgent
from storage.database import KubeVisionDB
from storage.models import AgentRunRecord, ClusterSummaryRecord, RCARecord


class AgentOrchestrator:
    """
    Orchestrates all 6 detection agents.
    Runs them in parallel, tracks their status, and persists results and automated RCA events.
    """

    def __init__(self, db: KubeVisionDB):
        self.db = db
        self.agents = {
            "CPU Agent": CPUAgent(),
            "Memory Agent": MemoryAgent(),
            "Network Agent": NetworkAgent(),
            "Storage Agent": StorageAgent(),
            "LogIO Agent": LogIOAgent(),
            "Scheduling Agent": SchedulingAgent(),
        }
        self.agent_heartbeats = {
            name: {"status": AgentStatus.IDLE.value, "last_run": None, "anomalies_found": 0}
            for name in self.agents
        }
        self.agent_results: Dict[str, AgentResult] = {}
        self.last_run: Optional[datetime] = None
        self.latest_synthesis: Optional[Dict[str, Any]] = None
        self.last_rca_triggered_time: Optional[datetime] = None

    async def run_all_agents(self, metrics: Dict[str, Any]) -> Dict[str, AgentResult]:
        self.last_run = datetime.utcnow()

        tasks = {name: asyncio.create_task(agent.run(metrics)) for name, agent in self.agents.items()}
        results = await asyncio.gather(*tasks.values())

        current_cycle_findings = []

        for result in results:
            self.agent_results[result.agent_name] = result
            current_cycle_findings.extend(result.findings)

            # Update heartbeat tracking
            self.agent_heartbeats[result.agent_name] = {
                "status": result.status.value,
                "last_run": result.timestamp.isoformat() if isinstance(result.timestamp, datetime) else result.timestamp,
                "anomalies_found": result.findings_count,
            }

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

        # Feature 4: Detect Anomaly Clusters and Trigger Automated RCA
        await self._check_and_trigger_rca(current_cycle_findings)

        return self.agent_results

    async def _check_and_trigger_rca(self, findings: List[Any]) -> None:
        """Trigger an RCA event if multiple anomalies are detected in a single collection cycle."""
        if len(findings) < 2:
            return

        now = datetime.utcnow()
        # Cooldown of 5 minutes between automated RCA triggers
        if self.last_rca_triggered_time and (now - self.last_rca_triggered_time).total_seconds() < 300:
            return

        # Extract primary service from findings
        services = [getattr(f, "pod_name", "") for f in findings if getattr(f, "pod_name", "")]
        primary = max(set(services), key=services.count) if services else "cluster-wide"
        symptoms = "; ".join(set(getattr(f, "description", "") for f in findings[:3]))

        suspected_root_cause = (
            "Cascading resource saturation or network dependency failure affecting multiple microservice endpoints."
            if len(findings) > 3 else "Resource constraint anomaly detected across container limits."
        )

        rca = RCARecord(
            timestamp=now,
            primary_service=primary,
            symptoms=symptoms,
            suspected_root_cause=suspected_root_cause,
            status="active",
        )

        try:
            await self.db.insert_rca_event(rca)
            self.last_rca_triggered_time = now
            print(f"✓ Automated RCA generated for incident cluster on {primary}")
        except Exception as e:
            print(f"Error generating automated RCA: {e}")

    def get_all_findings(self) -> List[Any]:
        findings = []
        for result in self.agent_results.values():
            findings.extend(result.findings)
        return findings

    def get_agent_statuses(self) -> List[Dict[str, Any]]:
        statuses = []
        for name, agent in self.agents.items():
            hb = self.agent_heartbeats.get(name, {})
            if hb.get("last_run"):
                statuses.append({
                    "name": name,
                    "description": agent.description,
                    "status": hb["status"],
                    "last_run": hb["last_run"],
                    "findings_count": hb["anomalies_found"],
                    "duration_ms": None,
                    "error": None,
                })
            else:
                statuses.append(agent.get_status())
        return statuses

    def get_status_summary(self) -> Dict[str, Any]:
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

    async def synthesize(self) -> None:
        all_findings = self.get_all_findings()
        critical = sum(1 for f in all_findings if getattr(f, "severity", None) == "critical")
        warning = sum(1 for f in all_findings if getattr(f, "severity", None) == "warning")
        health_score = max(0, 100 - (critical * 10 + warning * 3))

        sorted_findings = sorted(all_findings, key=lambda x: getattr(x, "timestamp", datetime.utcnow()), reverse=True)
        crit_findings_list = [f.to_dict() for f in sorted_findings if getattr(f, "severity", None) == "critical"][:3]

        llm_summary = f"Cluster health is {health_score}/100. {len(crit_findings_list)} critical issues detected across workloads."
        synthesis = {
            "health_score": health_score,
            "critical_findings": crit_findings_list,
            "llm_summary": llm_summary,
            "generated_at": datetime.utcnow().isoformat(),
        }
        self.latest_synthesis = synthesis
        try:
            await self.db.insert_cluster_summary(
                ClusterSummaryRecord(
                    timestamp=datetime.utcnow(),
                    health_score=health_score,
                    critical_findings=len(crit_findings_list),
                    llm_summary=llm_summary,
                )
            )
        except Exception as e:
            print(f"Synthesis DB record insertion error: {e}")

    def get_latest_synthesis(self) -> Optional[Dict[str, Any]]:
        return self.latest_synthesis
