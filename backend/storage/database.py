"""
SQLite database interface for KubeVision AI / PodMaster.
Uses aiosqlite for async operations. Includes migrations and seed data for advanced SRE features.
"""

import json
import sqlite3
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import aiosqlite

from .models import (
    AnomalyRecord,
    AgentRunRecord,
    MetricsSnapshotRecord,
    StorageMetricsRecord,
    ClusterSummaryRecord,
    RCARecord,
    SLORecord,
    AlertRuleRecord,
    ConfigEventRecord,
)


class KubeVisionDB:
    """
    Async SQLite database for persisting anomalies, agent runs, metrics, and SRE features (RCA, SLOs, Alerts).
    Supports concurrent reads and async writes without blocking the event loop.
    """

    def __init__(self, db_path: str = "./kubevision.db"):
        """
        Initialize database connection.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self.initialized = False

    async def initialize(self) -> None:
        """Initialize database schema and seed initial data. Call once at startup."""
        if self.initialized:
            return

        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(self._get_schema())
            await db.commit()
            await self._seed_default_data(db)
            await db.commit()

        self.initialized = True

    @staticmethod
    def _get_schema() -> str:
        """Return SQL schema for all tables."""
        return """
        CREATE TABLE IF NOT EXISTS anomalies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            namespace TEXT NOT NULL,
            pod_name TEXT NOT NULL,
            agent_name TEXT NOT NULL,
            anomaly_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT,
            llm_insight TEXT,
            metrics_json TEXT,
            resolved INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_runs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            agent_name TEXT NOT NULL,
            status TEXT NOT NULL,
            findings_count INTEGER DEFAULT 0,
            duration_ms REAL DEFAULT 0.0,
            error_message TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS metrics_snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            namespace TEXT NOT NULL,
            pod_name TEXT NOT NULL,
            cpu_usage REAL DEFAULT 0.0,
            cpu_limit REAL DEFAULT 0.0,
            memory_usage REAL DEFAULT 0.0,
            memory_limit REAL DEFAULT 0.0,
            restart_count INTEGER DEFAULT 0,
            error_rate REAL DEFAULT 0.0,
            network_in_bytes REAL DEFAULT 0.0,
            network_out_bytes REAL DEFAULT 0.0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS storage_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            namespace TEXT NOT NULL,
            pod_name TEXT NOT NULL,
            pvc_name TEXT NOT NULL,
            mount_path TEXT,
            capacity_bytes REAL DEFAULT 0.0,
            used_bytes REAL DEFAULT 0.0,
            available_bytes REAL DEFAULT 0.0,
            usage_percentage REAL DEFAULT 0.0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cluster_summaries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            health_score REAL DEFAULT 100.0,
            critical_findings INTEGER DEFAULT 0,
            llm_summary TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS rca_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            primary_service TEXT NOT NULL,
            symptoms TEXT,
            suspected_root_cause TEXT,
            status TEXT DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS slos (
            id TEXT PRIMARY KEY,
            service TEXT NOT NULL,
            objective_percentage REAL DEFAULT 99.9,
            current_availability REAL DEFAULT 100.0,
            budget_remaining REAL DEFAULT 100.0,
            status TEXT DEFAULT 'on_track',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS alert_rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            service TEXT NOT NULL,
            condition_json TEXT,
            status TEXT DEFAULT 'active',
            last_triggered_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS config_events (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            service TEXT NOT NULL,
            event_type TEXT NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_anomalies_timestamp ON anomalies(timestamp);
        CREATE INDEX IF NOT EXISTS idx_anomalies_namespace ON anomalies(namespace);
        CREATE INDEX IF NOT EXISTS idx_anomalies_pod ON anomalies(pod_name);
        CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON anomalies(severity);
        CREATE INDEX IF NOT EXISTS idx_agent_runs_timestamp ON agent_runs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_agent_runs_agent ON agent_runs(agent_name);
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics_snapshots(timestamp);
        CREATE INDEX IF NOT EXISTS idx_metrics_namespace ON metrics_snapshots(namespace);
        CREATE INDEX IF NOT EXISTS idx_storage_timestamp ON storage_metrics(timestamp);
        CREATE INDEX IF NOT EXISTS idx_storage_pvc ON storage_metrics(pvc_name);
        CREATE INDEX IF NOT EXISTS idx_rca_timestamp ON rca_events(timestamp);
        CREATE INDEX IF NOT EXISTS idx_config_timestamp ON config_events(timestamp);
        """

    async def _seed_default_data(self, db: aiosqlite.Connection) -> None:
        """Seed initial SLOs, Alert Rules, and sample Config Events if tables are empty."""
        # Check SLOs
        cursor = await db.execute("SELECT COUNT(*) FROM slos")
        row = await cursor.fetchone()
        if row and row[0] == 0:
            default_slos = [
                ("slo-1", "student-portal", 99.9, 99.95, 80.0, "on_track"),
                ("slo-2", "attendance-service", 99.5, 99.20, 15.0, "at_risk"),
                ("slo-3", "result-service", 99.0, 98.40, 0.0, "breached"),
                ("slo-4", "postgres-db", 99.99, 99.99, 100.0, "on_track"),
            ]
            for slo in default_slos:
                await db.execute(
                    "INSERT INTO slos (id, service, objective_percentage, current_availability, budget_remaining, status) VALUES (?, ?, ?, ?, ?, ?)",
                    slo
                )

        # Remove legacy demo alert rules so only user-created alerts remain.
        await db.execute(
            "DELETE FROM alert_rules WHERE id IN (?, ?, ?) OR name IN (?, ?, ?)",
            (
                "alert-1",
                "alert-2",
                "alert-3",
                "High CPU Usage (>80%)",
                "Memory Near Limit (>90%)",
                "High Error Rate (>5%)",
            ),
        )

        # Check Config Events
        cursor = await db.execute("SELECT COUNT(*) FROM config_events")
        row = await cursor.fetchone()
        if row and row[0] == 0:
            now = datetime.utcnow()
            sample_events = [
                ("cfg-1", (now - timedelta(minutes=45)).isoformat(), "student-portal", "deploy", "Successfully deployed v1.4.2 image"),
                ("cfg-2", (now - timedelta(minutes=30)).isoformat(), "attendance-service", "scale", "Autoscaled replicas from 1 to 2 due to load"),
                ("cfg-3", (now - timedelta(minutes=10)).isoformat(), "result-service", "config_change", "Updated DB connection timeout parameter"),
            ]
            for evt in sample_events:
                await db.execute(
                    "INSERT INTO config_events (id, timestamp, service, event_type, description) VALUES (?, ?, ?, ?, ?)",
                    evt
                )

    # -------------------------------------------------------------------------
    # Existing Anomaly, AgentRun, Metrics methods
    # -------------------------------------------------------------------------
    async def insert_anomaly(self, anomaly: AnomalyRecord) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO anomalies
                   (timestamp, namespace, pod_name, agent_name, anomaly_type,
                    severity, description, llm_insight, metrics_json, resolved)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    anomaly.timestamp.isoformat() if isinstance(anomaly.timestamp, datetime) else anomaly.timestamp,
                    anomaly.namespace,
                    anomaly.pod_name,
                    anomaly.agent_name,
                    anomaly.anomaly_type,
                    anomaly.severity,
                    anomaly.description,
                    anomaly.llm_insight,
                    anomaly.metrics_json,
                    1 if anomaly.resolved else 0,
                ),
            )
            await db.commit()
            return cursor.lastrowid

    async def get_anomalies(
        self,
        hours: int = 24,
        namespace: Optional[str] = None,
        severity: Optional[str] = None,
        pod_name: Optional[str] = None,
        limit: int = 1000,
    ) -> List[AnomalyRecord]:
        query = "SELECT * FROM anomalies WHERE 1=1"
        params: List[Any] = []

        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        query += " AND timestamp >= ?"
        params.append(cutoff_time.isoformat())

        if namespace and namespace != "all":
            query += " AND namespace = ?"
            params.append(namespace)
        if severity and severity != "all":
            query += " AND severity = ?"
            params.append(severity)
        if pod_name and pod_name != "all":
            query += " AND pod_name = ?"
            params.append(pod_name)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                async for row in cursor:
                    records.append(self._row_to_anomaly(row))

        return records

    async def insert_agent_run(self, run: AgentRunRecord) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO agent_runs
                   (timestamp, agent_name, status, findings_count, duration_ms, error_message)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    run.timestamp.isoformat() if isinstance(run.timestamp, datetime) else run.timestamp,
                    run.agent_name,
                    run.status,
                    run.findings_count,
                    run.duration_ms,
                    run.error_message,
                ),
            )
            await db.commit()
            return cursor.lastrowid

    async def get_agent_runs(self, agent_name: Optional[str] = None, hours: int = 24, limit: int = 1000) -> List[AgentRunRecord]:
        query = "SELECT * FROM agent_runs WHERE 1=1"
        params: List[Any] = []

        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        query += " AND timestamp >= ?"
        params.append(cutoff_time.isoformat())

        if agent_name:
            query += " AND agent_name = ?"
            params.append(agent_name)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                async for row in cursor:
                    records.append(self._row_to_agent_run(row))

        return records

    async def insert_metrics_snapshot(self, snapshot: MetricsSnapshotRecord) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO metrics_snapshots
                   (timestamp, namespace, pod_name, cpu_usage, cpu_limit,
                    memory_usage, memory_limit, restart_count, error_rate,
                    network_in_bytes, network_out_bytes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    snapshot.timestamp.isoformat() if isinstance(snapshot.timestamp, datetime) else snapshot.timestamp,
                    snapshot.namespace,
                    snapshot.pod_name,
                    snapshot.cpu_usage,
                    snapshot.cpu_limit,
                    snapshot.memory_usage,
                    snapshot.memory_limit,
                    snapshot.restart_count,
                    snapshot.error_rate,
                    snapshot.network_in_bytes,
                    snapshot.network_out_bytes,
                ),
            )
            await db.commit()
            return cursor.lastrowid

    async def insert_storage_metrics(self, storage: StorageMetricsRecord) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO storage_metrics
                   (timestamp, namespace, pod_name, pvc_name, mount_path,
                    capacity_bytes, used_bytes, available_bytes, usage_percentage)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    storage.timestamp.isoformat() if isinstance(storage.timestamp, datetime) else storage.timestamp,
                    storage.namespace,
                    storage.pod_name,
                    storage.pvc_name,
                    storage.mount_path,
                    storage.capacity_bytes,
                    storage.used_bytes,
                    storage.available_bytes,
                    storage.usage_percentage,
                ),
            )
            await db.commit()
            return cursor.lastrowid

    async def get_metrics_history(
        self,
        namespace: str,
        pod_name: str,
        hours: int = 1,
    ) -> List[MetricsSnapshotRecord]:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        query = """SELECT * FROM metrics_snapshots
                   WHERE timestamp >= ?"""
        params = [cutoff_time.isoformat()]
        if namespace != "all":
            query += " AND namespace = ?"
            params.append(namespace)
        if pod_name != "all":
            query += " AND pod_name = ?"
            params.append(pod_name)
        query += " ORDER BY timestamp DESC"

        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, params) as cursor:
                async for row in cursor:
                    records.append(self._row_to_metrics_snapshot(row))

        return records

    async def resolve_anomaly(self, anomaly_id: int) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE anomalies SET resolved = 1 WHERE id = ?", (anomaly_id,))
            await db.commit()

    async def cleanup_old_records(self, days: int = 7) -> None:
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM anomalies WHERE timestamp < ?", (cutoff,))
            await db.execute("DELETE FROM agent_runs WHERE timestamp < ?", (cutoff,))
            await db.execute("DELETE FROM metrics_snapshots WHERE timestamp < ?", (cutoff,))
            await db.execute("DELETE FROM storage_metrics WHERE timestamp < ?", (cutoff,))
            await db.commit()

    # -------------------------------------------------------------------------
    # New SRE CRUD Methods (ClusterSummary, RCA, SLO, Alert, ConfigEvent)
    # -------------------------------------------------------------------------
    async def insert_cluster_summary(self, summary: ClusterSummaryRecord) -> int:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO cluster_summaries
                   (timestamp, health_score, critical_findings, llm_summary)
                   VALUES (?, ?, ?, ?)""",
                (
                    summary.timestamp.isoformat() if isinstance(summary.timestamp, datetime) else summary.timestamp,
                    summary.health_score,
                    summary.critical_findings,
                    summary.llm_summary,
                )
            )
            await db.commit()
            return cursor.lastrowid

    async def insert_rca_event(self, rca: RCARecord) -> str:
        rca_id = rca.id or f"rca-{uuid.uuid4().hex[:8]}"
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT OR REPLACE INTO rca_events
                   (id, timestamp, primary_service, symptoms, suspected_root_cause, status)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    rca_id,
                    rca.timestamp.isoformat() if isinstance(rca.timestamp, datetime) else rca.timestamp,
                    rca.primary_service,
                    rca.symptoms,
                    rca.suspected_root_cause,
                    rca.status,
                )
            )
            await db.commit()
            return rca_id

    async def get_recent_rcas(self, limit: int = 10) -> List[RCARecord]:
        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT * FROM rca_events ORDER BY timestamp DESC LIMIT ?", (limit,)) as cursor:
                async for row in cursor:
                    records.append(
                        RCARecord(
                            id=row[0],
                            timestamp=datetime.fromisoformat(row[1]) if row[1] else datetime.utcnow(),
                            primary_service=row[2],
                            symptoms=row[3] or "",
                            suspected_root_cause=row[4] or "",
                            status=row[5] or "active",
                        )
                    )
        return records

    async def get_rca_by_id(self, rca_id: str) -> Optional[RCARecord]:
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT * FROM rca_events WHERE id = ?", (rca_id,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    return RCARecord(
                        id=row[0],
                        timestamp=datetime.fromisoformat(row[1]) if row[1] else datetime.utcnow(),
                        primary_service=row[2],
                        symptoms=row[3] or "",
                        suspected_root_cause=row[4] or "",
                        status=row[5] or "active",
                    )
        return None

    async def get_slos(self) -> List[SLORecord]:
        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT * FROM slos ORDER BY service ASC") as cursor:
                async for row in cursor:
                    records.append(
                        SLORecord(
                            id=row[0],
                            service=row[1],
                            objective_percentage=row[2],
                            current_availability=row[3],
                            budget_remaining=row[4],
                            status=row[5],
                        )
                    )
        return records

    async def update_slo(self, slo_id: str, availability: float, budget: float, status: str) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE slos SET current_availability = ?, budget_remaining = ?, status = ? WHERE id = ?",
                (availability, budget, status, slo_id)
            )
            await db.commit()

    async def get_alert_rules(self) -> List[AlertRuleRecord]:
        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT * FROM alert_rules ORDER BY created_at DESC") as cursor:
                async for row in cursor:
                    records.append(
                        AlertRuleRecord(
                            id=row[0],
                            name=row[1],
                            service=row[2],
                            condition_json=row[3] or "{}",
                            status=row[4] or "active",
                            last_triggered_at=row[5],
                        )
                    )
        return records

    async def insert_alert_rule(self, alert: AlertRuleRecord) -> str:
        alert_id = alert.id or f"alert-{uuid.uuid4().hex[:8]}"
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO alert_rules (id, name, service, condition_json, status, last_triggered_at)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (alert_id, alert.name, alert.service, alert.condition_json, alert.status, alert.last_triggered_at)
            )
            await db.commit()
            return alert_id

    async def trigger_alert_rule(self, alert_id: str) -> None:
        now = datetime.utcnow().isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE alert_rules SET status = 'triggered', last_triggered_at = ? WHERE id = ?", (now, alert_id))
            await db.commit()

    async def get_config_events(self, hours: int = 24) -> List[ConfigEventRecord]:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT * FROM config_events WHERE timestamp >= ? ORDER BY timestamp DESC", (cutoff_time.isoformat(),)) as cursor:
                async for row in cursor:
                    records.append(
                        ConfigEventRecord(
                            id=row[0],
                            timestamp=datetime.fromisoformat(row[1]) if row[1] else datetime.utcnow(),
                            service=row[2],
                            event_type=row[3],
                            description=row[4] or "",
                        )
                    )
        return records

    async def insert_config_event(self, event: ConfigEventRecord) -> str:
        event_id = event.id or f"cfg-{uuid.uuid4().hex[:8]}"
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """INSERT INTO config_events (id, timestamp, service, event_type, description)
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    event_id,
                    event.timestamp.isoformat() if isinstance(event.timestamp, datetime) else event.timestamp,
                    event.service,
                    event.event_type,
                    event.description,
                )
            )
            await db.commit()
            return event_id

    # -------------------------------------------------------------------------
    # Helper row converters
    # -------------------------------------------------------------------------
    @staticmethod
    def _row_to_anomaly(row: tuple) -> AnomalyRecord:
        return AnomalyRecord(
            id=row[0],
            timestamp=datetime.fromisoformat(row[1]) if row[1] else datetime.utcnow(),
            namespace=row[2],
            pod_name=row[3],
            agent_name=row[4],
            anomaly_type=row[5],
            severity=row[6],
            description=row[7],
            llm_insight=row[8],
            metrics_json=row[9],
            resolved=bool(row[10]),
        )

    @staticmethod
    def _row_to_agent_run(row: tuple) -> AgentRunRecord:
        return AgentRunRecord(
            id=row[0],
            timestamp=datetime.fromisoformat(row[1]) if row[1] else datetime.utcnow(),
            agent_name=row[2],
            status=row[3],
            findings_count=row[4],
            duration_ms=row[5],
            error_message=row[6],
        )

    @staticmethod
    def _row_to_metrics_snapshot(row: tuple) -> MetricsSnapshotRecord:
        return MetricsSnapshotRecord(
            id=row[0],
            timestamp=datetime.fromisoformat(row[1]) if row[1] else datetime.utcnow(),
            namespace=row[2],
            pod_name=row[3],
            cpu_usage=row[4],
            cpu_limit=row[5],
            memory_usage=row[6],
            memory_limit=row[7],
            restart_count=row[8],
            error_rate=row[9],
            network_in_bytes=row[10],
            network_out_bytes=row[11],
        )
