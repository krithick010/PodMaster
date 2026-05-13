"""
SQLite database interface for KubeVision AI.
Uses aiosqlite for async operations.
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import aiosqlite

from .models import AnomalyRecord, AgentRunRecord, MetricsSnapshotRecord, StorageMetricsRecord


class KubeVisionDB:
    """
    Async SQLite database for persisting anomalies, agent runs, and metrics.
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
        """Initialize database schema. Call once at startup."""
        if self.initialized:
            return

        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(self._get_schema())
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
        """

    async def insert_anomaly(self, anomaly: AnomalyRecord) -> int:
        """
        Insert an anomaly record into the database.

        Args:
            anomaly: AnomalyRecord to insert

        Returns:
            ID of inserted record
        """
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO anomalies
                   (timestamp, namespace, pod_name, agent_name, anomaly_type,
                    severity, description, llm_insight, metrics_json, resolved)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    anomaly.timestamp.isoformat(),
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
        """
        Query anomalies from the database.

        Args:
            hours: Look back this many hours (default 24)
            namespace: Filter by namespace (optional)
            severity: Filter by severity (optional)
            pod_name: Filter by pod name (optional)
            limit: Max records to return

        Returns:
            List of AnomalyRecord objects
        """
        query = "SELECT * FROM anomalies WHERE 1=1"
        params: List[Any] = []

        # Time filter
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        query += " AND timestamp >= ?"
        params.append(cutoff_time.isoformat())

        # Optional filters
        if namespace:
            query += " AND namespace = ?"
            params.append(namespace)
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        if pod_name:
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
        """
        Insert an agent run record.

        Args:
            run: AgentRunRecord to insert

        Returns:
            ID of inserted record
        """
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO agent_runs
                   (timestamp, agent_name, status, findings_count, duration_ms, error_message)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    run.timestamp.isoformat(),
                    run.agent_name,
                    run.status,
                    run.findings_count,
                    run.duration_ms,
                    run.error_message,
                ),
            )
            await db.commit()
            return cursor.lastrowid

    async def insert_metrics_snapshot(self, snapshot: MetricsSnapshotRecord) -> int:
        """
        Insert a metrics snapshot.

        Args:
            snapshot: MetricsSnapshotRecord to insert

        Returns:
            ID of inserted record
        """
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO metrics_snapshots
                   (timestamp, namespace, pod_name, cpu_usage, cpu_limit,
                    memory_usage, memory_limit, restart_count, error_rate,
                    network_in_bytes, network_out_bytes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    snapshot.timestamp.isoformat(),
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
        """
        Insert storage metrics record.

        Args:
            storage: StorageMetricsRecord to insert

        Returns:
            ID of inserted record
        """
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO storage_metrics
                   (timestamp, namespace, pod_name, pvc_name, mount_path,
                    capacity_bytes, used_bytes, available_bytes, usage_percentage)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    storage.timestamp.isoformat(),
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

    async def get_agent_runs(self, agent_name: Optional[str] = None, hours: int = 24, limit: int = 1000) -> List[AgentRunRecord]:
        """
        Query agent run records.

        Args:
            agent_name: Filter by agent name (optional)
            hours: Look back this many hours
            limit: Max records to return

        Returns:
            List of AgentRunRecord objects
        """
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

    async def get_metrics_history(
        self,
        namespace: str,
        pod_name: str,
        hours: int = 1,
    ) -> List[MetricsSnapshotRecord]:
        """
        Get historical metrics for a pod.

        Args:
            namespace: Pod namespace
            pod_name: Pod name
            hours: Look back this many hours

        Returns:
            List of MetricsSnapshotRecord objects
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        query = """SELECT * FROM metrics_snapshots
                   WHERE namespace = ? AND pod_name = ? AND timestamp >= ?
                   ORDER BY timestamp DESC"""

        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute(query, (namespace, pod_name, cutoff_time.isoformat())) as cursor:
                async for row in cursor:
                    records.append(self._row_to_metrics_snapshot(row))

        return records

    async def resolve_anomaly(self, anomaly_id: int) -> None:
        """Mark an anomaly as resolved."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE anomalies SET resolved = 1 WHERE id = ?", (anomaly_id,))
            await db.commit()

    async def cleanup_old_records(self, days: int = 7) -> None:
        """Delete records older than specified days."""
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM anomalies WHERE timestamp < ?", (cutoff,))
            await db.execute("DELETE FROM agent_runs WHERE timestamp < ?", (cutoff,))
            await db.execute("DELETE FROM metrics_snapshots WHERE timestamp < ?", (cutoff,))
            await db.execute("DELETE FROM storage_metrics WHERE timestamp < ?", (cutoff,))
            await db.commit()

    @staticmethod
    def _row_to_anomaly(row: tuple) -> AnomalyRecord:
        """Convert database row to AnomalyRecord."""
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
        """Convert database row to AgentRunRecord."""
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
        """Convert database row to MetricsSnapshotRecord."""
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
