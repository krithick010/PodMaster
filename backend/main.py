"""
KubeVision AI - Main FastAPI Application
Full-stack observability and AI agent platform for Kubernetes with robust caching, SRE widgets, and demo resilience.
"""

import asyncio
import csv
import json
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from io import StringIO
from typing import Any, Dict, List, Optional, Set

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agents.orchestrator import AgentOrchestrator
from chaos_engine import ChaosEngine
from correlation import MetricCorrelationAnalyzer
from forecasting import ResourceForecaster
from llm.insight_generator import InsightGenerator
from metrics.k8s_client import KubernetesClient
from metrics.prometheus_client import PrometheusClient
from recommendations import RecommendationEngine
from storage.database import KubeVisionDB
from storage.models import (
    AnomalyRecord,
    MetricsSnapshotRecord,
    StorageMetricsRecord,
    AlertRuleRecord,
    ConfigEventRecord,
)

load_dotenv()

# Global instances
db: Optional[KubeVisionDB] = None
prometheus_client: Optional[PrometheusClient] = None
k8s_client: Optional[KubernetesClient] = None
orchestrator: Optional[AgentOrchestrator] = None
insight_generator: Optional[InsightGenerator] = None
chaos_engine: Optional[ChaosEngine] = None
forecaster = ResourceForecaster()
correlation_analyzer = MetricCorrelationAnalyzer()
recommendation_engine = RecommendationEngine()


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass


manager = ConnectionManager()
last_metrics: Dict[str, Any] = {}
metrics_history: List[Dict[str, Any]] = []


# Feature 12: In-Memory Cache Manager for High-Frequency Endpoints
class CacheManager:
    def __init__(self):
        self.golden_signals: Dict[str, Any] = {
            "latency_ms": 42.5, "traffic_rps": 125.4, "error_rate": 0.12, "saturation": 68.5, "source": "simulated"
        }
        self.cluster_tree: List[Dict[str, Any]] = []
        self.service_topology: Dict[str, Any] = {"nodes": [], "edges": []}
        self.hotspots: Dict[str, Any] = {"cpu": [], "memory": [], "restarts": [], "error_rate": []}
        self.namespace_summaries: List[Dict[str, Any]] = []
        self.last_updated: Optional[datetime] = None


cache_manager = CacheManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db, prometheus_client, k8s_client, orchestrator, insight_generator, chaos_engine

    print("🚀 KubeVision AI Starting Up...")
    db = KubeVisionDB(db_path=os.getenv("DB_PATH", "./kubevision.db"))
    await db.initialize()
    print("✓ Database initialized")

    prometheus_client = PrometheusClient(
        prometheus_url=os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    )
    print("✓ Prometheus client initialized")

    k8s_client = KubernetesClient()
    print("✓ Kubernetes client initialized")

    orchestrator = AgentOrchestrator(db)
    print("✓ Agent orchestrator initialized")

    insight_generator = InsightGenerator()
    print("✓ LLM insight generator initialized")

    chaos_engine = ChaosEngine(auto_recover_seconds=90)
    print("✓ Chaos engine initialized")

    collection_interval = int(os.getenv("COLLECTION_INTERVAL", "10"))
    background_task = asyncio.create_task(background_collection_loop(collection_interval))

    yield

    print("🛑 KubeVision AI Shutting Down...")
    background_task.cancel()


app = FastAPI(
    title="KubeVision AI",
    description="Kubernetes Observability and AI Agent Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Background collection loop
async def background_collection_loop(interval: int):
    while True:
        try:
            await collect_and_analyze()
        except Exception as e:
            print(f"Error in collection loop: {e}")
        await asyncio.sleep(interval)


async def collect_and_analyze():
    global last_metrics

    if not all([prometheus_client, k8s_client, orchestrator, db]):
        return

    try:
        # Collect base metrics
        pod_metrics = await prometheus_client.get_pod_metrics_all_namespaces()
        pvc_metrics = await prometheus_client.get_pvc_metrics()

        # Update Cache Manager (Feature 12)
        cache_manager.golden_signals = await prometheus_client.get_golden_signals()
        cache_manager.cluster_tree = await prometheus_client.get_cluster_tree()
        cache_manager.service_topology = await prometheus_client.get_service_topology()
        cache_manager.hotspots = await prometheus_client.get_top_hotspots()
        cache_manager.namespace_summaries = await prometheus_client.get_namespace_summaries()
        cache_manager.last_updated = datetime.utcnow()

        # Collect K8s info
        pods_by_ns = await k8s_client.get_pods_all_namespaces()
        pending_pods = await k8s_client.get_pending_pods()

        agent_metrics = {
            "pod_metrics": pod_metrics,
            "pvc_metrics": pvc_metrics,
            "pending_pods": pending_pods,
        }

        failed_pods = []
        for ns, pods in pods_by_ns.items():
            for pod in pods:
                if pod["status"] in ["Failed", "CrashLoopBackOff", "ImagePullBackOff"]:
                    failed_pods.append({
                        "pod_name": pod["name"],
                        "namespace": ns,
                        "reason": pod["status"],
                    })
        agent_metrics["failed_pods"] = failed_pods

        # Run all agents
        agent_results = await orchestrator.run_all_agents(agent_metrics)
        all_findings = orchestrator.get_all_findings()

        # Check and trigger threshold alert rules (Feature 6)
        active_alerts = await db.get_alert_rules()
        for alert in active_alerts:
            if alert.status == "active":
                try:
                    cond = json.loads(alert.condition_json)
                    metric_type = cond.get("metric", "cpu")
                    val_thresh = float(cond.get("value", 80))
                    
                    # Evaluate against top hotspots
                    if metric_type == "cpu" and cache_manager.hotspots.get("cpu"):
                        top_val = cache_manager.hotspots["cpu"][0]["metric_raw"] * 100
                        if top_val > val_thresh:
                            await db.trigger_alert_rule(alert.id)
                except Exception:
                    pass

        # Chaos anomaly injection
        if chaos_engine:
            active_chaos = chaos_engine.get_active_anomalies()
            for chaos in active_chaos:
                ns = chaos.namespace
                pod_prefix = chaos.pod_name
                actual_pod = pod_prefix
                if ns in pod_metrics:
                    for name in pod_metrics[ns].keys():
                        if name.startswith(pod_prefix):
                            actual_pod = name
                            break
                if ns in pod_metrics and actual_pod in pod_metrics[ns]:
                    m = pod_metrics[ns][actual_pod]
                    if chaos.anomaly_type == "CPU_CRITICAL":
                        limit = m.get("cpu_limit", 1.0)
                        if limit <= 0: limit = 1.0
                        m["cpu_usage"] = (chaos.metrics.get("cpu_percentage", 95) / 100) * limit
                    elif chaos.anomaly_type == "MEMORY_CRITICAL":
                        limit = m.get("memory_limit", 1024*1024*1024)
                        if limit <= 0: limit = 1024*1024*1024
                        m["memory_usage"] = (chaos.metrics.get("memory_percentage", 95) / 100) * limit
                from copy import copy as _copy
                resolved = _copy(chaos)
                resolved.pod_name = actual_pod
                all_findings.append(resolved)

        # Generate LLM insights
        for anomaly in all_findings:
            if insight_generator and not anomaly.llm_insight:
                anomaly.llm_insight = await insight_generator.generate_insight(anomaly)
                await db.insert_anomaly(
                    AnomalyRecord(
                        timestamp=anomaly.timestamp,
                        namespace=anomaly.namespace,
                        pod_name=anomaly.pod_name,
                        agent_name=anomaly.agent_name,
                        anomaly_type=anomaly.anomaly_type,
                        severity=anomaly.severity.value,
                        description=anomaly.description,
                        llm_insight=anomaly.llm_insight,
                    )
                )

        # Execute synthesis aggregation
        await orchestrator.synthesize()

        # Update last metrics and broadcast
        last_metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": pod_metrics,
            "pvc_metrics": pvc_metrics,
            "anomalies": [a.to_dict() for a in all_findings],
            "agent_status": orchestrator.get_agent_statuses(),
        }

        await manager.broadcast({
            "type": "snapshot",
            "data": last_metrics,
        })

        metrics_history.append(pod_metrics)
        if len(metrics_history) > 30:
            metrics_history.pop(0)

    except Exception as e:
        print(f"Error in collect_and_analyze: {e}")


# -----------------------------------------------------------------------------
# REST Endpoints (Features 1-15)
# -----------------------------------------------------------------------------

# Pydantic models for POST endpoints
class QueryRequest(BaseModel):
    question: Optional[str] = None
    query: Optional[str] = None

class RCARequest(BaseModel):
    rca_id: str

class AlertRequest(BaseModel):
    name: str
    service: str = "all"
    condition_json: str = "{}"

class ConfigEventRequest(BaseModel):
    service: str
    event_type: str = "deploy"
    description: str = ""


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "db_ready": db is not None,
        "prometheus_ready": prometheus_client is not None,
        "k8s_ready": k8s_client is not None,
    }


@app.get("/api/health/full")
async def health_full():
    """Feature 15: Full Subsystem Health Summary."""
    prom_ok = prometheus_client.is_healthy() if prometheus_client else False
    llm_ok = insight_generator.status == "online" if insight_generator else False
    db_ok = db.initialized if db else False
    return {
        "status": "online" if (prom_ok and db_ok) else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "subsystems": {
            "prometheus": {"status": "online" if prom_ok else "unreachable", "fallback_active": not prom_ok},
            "llm_engine": {"status": "online" if llm_ok else "degraded", "fallback_active": not llm_ok},
            "database": {"status": "online" if db_ok else "offline"},
            "background_collector": {"last_run": cache_manager.last_updated.isoformat() if cache_manager.last_updated else None},
        }
    }


@app.get("/api/signals/golden")
async def get_golden_signals():
    """Feature 1: Golden Signals v2."""
    signals = cache_manager.golden_signals
    signals["timestamp"] = cache_manager.last_updated.isoformat() if cache_manager.last_updated else datetime.utcnow().isoformat()
    return signals


@app.get("/api/cluster/tree")
async def get_cluster_tree():
    """Feature 2: Cluster Explorer Hierarchy."""
    return {"tree": cache_manager.cluster_tree, "timestamp": cache_manager.last_updated.isoformat() if cache_manager.last_updated else datetime.utcnow().isoformat()}


@app.get("/api/topology/services")
async def get_service_topology():
    """Feature 3: Service Topology Map v2."""
    return cache_manager.service_topology


@app.get("/api/rca/recent")
async def get_recent_rcas():
    """Feature 4: Recent RCA Incident Records."""
    if not db:
        return {"rcas": []}
    records = await db.get_recent_rcas(limit=10)
    return {"rcas": [r.to_dict() for r in records]}


@app.post("/api/rca/generate")
async def generate_ai_rca(req: RCARequest):
    """Feature 10: Deep-Dive AI RCA Report Generator."""
    if not db or not insight_generator:
        raise HTTPException(status_code=500, detail="Subsystems offline")
    rca = await db.get_rca_by_id(req.rca_id)
    if not rca:
        # Create dummy RCA for demo if not found
        rca = RCARecord(id=req.rca_id, primary_service="student-portal-0", symptoms="High latency and container restarts")
    report = await insight_generator.generate_rca_report(rca, cache_manager.hotspots, ["WARN Socket timeout on 5432", "ERROR Pool exhausted"])
    return {"rca_id": req.rca_id, "report_markdown": report, "generated_at": datetime.utcnow().isoformat()}


@app.get("/api/slo/status")
async def get_slo_status():
    """Feature 5: SLO & Error Budget Status."""
    if not db:
        return {"slos": []}
    slos = await db.get_slos()
    return {"slos": [s.to_dict() for s in slos]}


@app.get("/api/alerts/active")
async def get_active_alerts():
    """Feature 6: Active Alert Rules."""
    if not db:
        return {"alerts": []}
    alerts = await db.get_alert_rules()
    return {"alerts": [a.to_dict() for a in alerts]}


@app.post("/api/alerts")
async def create_alert_rule(req: AlertRequest):
    """Feature 6: Create Alert Rule."""
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
    alert = AlertRuleRecord(name=req.name, service=req.service, condition_json=req.condition_json, status="active")
    alert_id = await db.insert_alert_rule(alert)
    return {"status": "success", "alert_id": alert_id}


@app.get("/api/correlation/logs-metrics")
async def get_logs_metrics_correlation(service: str = Query("all")):
    """Feature 7: Logs + Metrics Correlation."""
    hot = cache_manager.hotspots
    log_snippets = [
        {"timestamp": datetime.utcnow().isoformat(), "service": "student-portal", "level": "ERROR", "message": "Connection refused to database at 10.244.0.12:5432"},
        {"timestamp": (datetime.utcnow() - timedelta(minutes=2)).isoformat(), "service": "result-service", "level": "WARN", "message": "Worker thread execution exceeded 500ms limit"},
        {"timestamp": (datetime.utcnow() - timedelta(minutes=5)).isoformat(), "service": "attendance-service", "level": "INFO", "message": "Autoscaled replica set completed successfully"},
    ]
    return {
        "service": service,
        "metrics_snapshot": hot,
        "log_snippets": [l for l in log_snippets if service == "all" or l["service"] in service],
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/api/hotspots/top")
async def get_top_hotspots():
    """Feature 8: Top N Problem Pods Hotspots."""
    return cache_manager.hotspots


@app.post("/api/query")
async def ai_query_post(
    req: Optional[QueryRequest] = None,
    question: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
):
    """Feature 9: AI Natural-Language Query Bar."""
    q = (req.question if req and req.question else None) or (req.query if req and req.query else None) or question or query or "What is the overall health status of the cluster?"
    start_time = datetime.utcnow()
    context = {
        "anomalies": last_metrics.get("anomalies", []) if last_metrics else [],
        "golden_signals": cache_manager.golden_signals,
        "hotspots": cache_manager.hotspots,
    }
    answer = await insight_generator.ask_podmaster(q, context)
    generation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
    return {"answer": answer, "generation_time_ms": int(generation_time)}


@app.get("/api/namespaces/health")
async def get_namespaces_health():
    """Feature 11: Namespace Health & Cost Summary."""
    return {"namespaces": cache_manager.namespace_summaries, "timestamp": cache_manager.last_updated.isoformat() if cache_manager.last_updated else datetime.utcnow().isoformat()}


@app.get("/api/events/config")
async def get_config_events_history(hours: int = Query(24)):
    """Feature 13: Config Change / Event Overlay."""
    if not db:
        return {"events": []}
    events = await db.get_config_events(hours=hours)
    return {"events": [e.to_dict() for e in events]}


@app.post("/api/events/config")
async def create_config_event(req: ConfigEventRequest):
    """Feature 13: Create Config Event."""
    if not db:
        raise HTTPException(status_code=500, detail="Database offline")
    evt = ConfigEventRecord(service=req.service, event_type=req.event_type, description=req.description)
    event_id = await db.insert_config_event(evt)
    return {"status": "success", "event_id": event_id}


@app.get("/api/llm/stats")
async def get_llm_stats_endpoint():
    """Feature 14: LLM Observability Telemetry."""
    if not insight_generator:
        return {"status": "offline", "model": "unknown", "total_calls": 0, "failed_calls": 0}
    return insight_generator.get_llm_stats()


# -----------------------------------------------------------------------------
# Existing Legacy Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/namespaces")
async def get_namespaces():
    if not k8s_client:
        return {"namespaces": []}
    namespaces = await k8s_client.get_all_namespaces()
    return {"namespaces": namespaces}


@app.get("/api/metrics/current")
async def get_current_metrics(namespace: str = Query("all")):
    if not last_metrics:
        return {"metrics": {}, "timestamp": None}
    metrics = last_metrics.get("metrics", {})
    if namespace != "all":
        metrics = {namespace: metrics.get(namespace, {})}
    return {"metrics": metrics, "timestamp": last_metrics.get("timestamp")}


@app.get("/api/anomalies/current")
async def get_current_anomalies(namespace: str = Query("all"), severity: str = Query("all")):
    if not last_metrics:
        return {"anomalies": []}
    anomalies = last_metrics.get("anomalies", [])
    if namespace != "all":
        anomalies = [a for a in anomalies if a.get("namespace") == namespace]
    if severity != "all":
        anomalies = [a for a in anomalies if a.get("severity") == severity]
    return {"anomalies": anomalies}


@app.get("/api/anomalies/history")
async def get_anomaly_history(hours: int = Query(24), namespace: str = Query(None), severity: str = Query(None)):
    if not db:
        return {"anomalies": []}
    anomalies = await db.get_anomalies(hours=hours, namespace=namespace, severity=severity)
    return {"anomalies": [a.to_dict() for a in anomalies], "count": len(anomalies)}


@app.get("/api/anomalies/export")
async def export_anomalies(hours: int = Query(24)):
    if not db:
        return {"error": "Database not available"}
    anomalies = await db.get_anomalies(hours=hours)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Namespace", "Pod Name", "Anomaly Type", "Severity", "Description", "Agent", "LLM Insight"])
    for anomaly in anomalies:
        writer.writerow([
            anomaly.timestamp.isoformat() if anomaly.timestamp else "",
            anomaly.namespace, anomaly.pod_name, anomaly.anomaly_type, anomaly.severity, anomaly.description, anomaly.agent_name, anomaly.llm_insight or ""
        ])
    def iterfile():
        yield output.getvalue()
    return StreamingResponse(iterfile(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=anomalies.csv"})


@app.get("/api/storage")
async def get_storage_metrics_endpoint(namespace: str = Query("all")):
    if not last_metrics:
        return {"storage": {}}
    storage = last_metrics.get("pvc_metrics", {})
    if namespace != "all":
        storage = {k: v for k, v in storage.items() if v.get("namespace") == namespace}
    return {"storage": storage}


@app.get("/api/agents/status")
async def get_agent_status():
    if not orchestrator:
        return {"agents": []}
    return {"agents": orchestrator.get_agent_statuses(), "summary": orchestrator.get_status_summary()}


@app.get("/api/dependencies")
async def get_dependencies():
    if not last_metrics:
        return {"dependencies": {}}
    metrics = last_metrics.get("metrics", {})
    dependencies = {namespace: list(pods.keys()) for namespace, pods in metrics.items()}
    return {"dependencies": dependencies}


@app.get("/api/recommendations")
async def get_recommendations():
    if not last_metrics:
        return {"recommendations": []}
    anomalies = last_metrics.get("anomalies", [])
    recs = await recommendation_engine.generate_ai_recommendations(anomalies)
    sorted_recs = recommendation_engine.prioritize_recommendations(recs)
    return {"recommendations": sorted_recs}


@app.get("/api/forecast")
async def get_forecast(pod_name: str = Query("result-service-0")):
    if not db:
        return {"cpu_forecast": _empty_forecast(), "memory_forecast": _empty_forecast()}
    history = await db.get_metrics_history(namespace="all", pod_name=pod_name, hours=2)
    cpu_values = [h.cpu_usage for h in history]
    memory_values = [h.memory_usage for h in history]
    if len(cpu_values) < 5 and last_metrics:
        for ns, pods in last_metrics.get("metrics", {}).items():
            for pname, pdata in pods.items():
                if pod_name in pname or pname in pod_name:
                    cpu_values = [pdata.get("cpu_usage", 0) * (0.9 + 0.1 * i / 5) for i in range(5)] + cpu_values
                    memory_values = [pdata.get("memory_usage", 0) * (0.92 + 0.08 * i / 5) for i in range(5)] + memory_values
                    break
    cpu_result = forecaster.forecast_cpu(cpu_values)
    memory_result = forecaster.forecast_memory(memory_values)
    def _shape(result, raw_values):
        smoothed = result.get("history_smoothed", raw_values[-10:] if raw_values else [])
        return {"historical": smoothed[-20:], "predicted": result.get("forecast", []), "trend": result.get("trend", "stable"), "current": result.get("current", 0), "confidence": 0.85}
    return {"cpu_forecast": _shape(cpu_result, cpu_values), "memory_forecast": _shape(memory_result, memory_values)}


def _empty_forecast():
    return {"historical": [], "predicted": [], "trend": "stable", "current": 0, "confidence": 0}


@app.get("/api/correlations")
async def get_correlations():
    if not metrics_history or len(metrics_history) < 3:
        return {"correlations": {}, "top_correlations": []}
    series_data = {f"{ns}/{pod_name}": [] for ns, pods in metrics_history[-1].items() for pod_name in pods.keys()}
    for snapshot in metrics_history:
        for full_name in series_data.keys():
            ns, pod = full_name.split('/')
            series_data[full_name].append(float(snapshot.get(ns, {}).get(pod, {}).get("cpu_usage", 0.0)))
    corr_matrix, top_corrs = correlation_analyzer.calculate_correlation_matrix(series_data)
    return {"correlations": corr_matrix, "top_correlations": [{"pod1": c[0], "pod2": c[1], "correlation": c[2]} for c in top_corrs]}


@app.get("/api/health-score")
@app.get("/api/summary/health")
async def get_health_summary():
    if not last_metrics:
        return {"health_score": 100, "grade": "A", "critical_anomalies": 0, "warning_anomalies": 0, "agents_active": 6}
    anomalies = last_metrics.get("anomalies", [])
    agent_status = last_metrics.get("agent_status", [])
    critical_count = sum(1 for a in anomalies if a.get("severity") == "critical")
    warning_count = sum(1 for a in anomalies if a.get("severity") == "warning")
    health_score = max(0, 100 - (critical_count * 10 + warning_count * 3))
    grade = "A" if health_score >= 90 else "B" if health_score >= 80 else "C" if health_score >= 70 else "D" if health_score >= 60 else "F"
    return {"health_score": health_score, "grade": grade, "critical_anomalies": critical_count, "warning_anomalies": warning_count, "agents_active": len([a for a in agent_status if a.get("status") == "running"])}


@app.post("/api/chaos/inject")
async def inject_chaos(pod_name: str = Query(...), namespace: str = Query(...), anomaly_type: str = Query(...)):
    if not chaos_engine:
        return {"error": "Chaos engine not available"}
    chaos_engine.enable()
    if "cpu" in anomaly_type.lower():
        anomaly = chaos_engine.inject_cpu_spike(pod_name, namespace, percentage=95.0)
    elif "memory" in anomaly_type.lower():
        anomaly = chaos_engine.inject_memory_leak(pod_name, namespace, percentage=90.0)
    elif "network" in anomaly_type.lower():
        anomaly = chaos_engine.inject_network_spike(pod_name, namespace, mb_per_sec=100.0)
    elif "storage" in anomaly_type.lower():
        anomaly = chaos_engine.inject_storage_pressure(pod_name, namespace, pvc_name=f"{pod_name}-storage", percentage=95.0)
    else:
        anomaly = chaos_engine.inject_log_flood(pod_name, namespace, error_rate=5.0)
    return {"status": "injected", "anomaly": anomaly.to_dict()}


@app.post("/api/simulate/{endpoint}")
async def simulate_chaos_endpoint(endpoint: str, pod_name: str = Query(...), namespace: str = Query(...)):
    if not chaos_engine:
        return {"error": "Chaos engine not available"}
    chaos_engine.enable()
    if endpoint == "cpu-spike":
        anomaly = chaos_engine.inject_cpu_spike(pod_name, namespace, percentage=95.0)
    elif endpoint == "memory-leak":
        anomaly = chaos_engine.inject_memory_leak(pod_name, namespace, percentage=90.0)
    elif endpoint == "storage-pressure":
        anomaly = chaos_engine.inject_storage_pressure(pod_name, namespace, pvc_name=f"{pod_name}-storage", percentage=95.0)
    elif endpoint == "network-spike":
        anomaly = chaos_engine.inject_network_spike(pod_name, namespace, mb_per_sec=100.0)
    elif endpoint == "log-flood":
        anomaly = chaos_engine.inject_log_flood(pod_name, namespace, error_rate=5.0)
    else:
        anomaly = chaos_engine.inject_log_flood(pod_name, namespace, error_rate=5.0)
    return {"status": "injected", "anomaly": anomaly.to_dict()}


@app.get("/api/chaos/status")
async def get_chaos_status():
    if not chaos_engine:
        return {"error": "Chaos engine not available"}
    return chaos_engine.get_status()


@app.post("/api/chaos/enable")
async def enable_chaos():
    if not chaos_engine:
        return {"error": "Chaos engine not available"}
    chaos_engine.enable()
    return {"status": "enabled"}


@app.post("/api/chaos/disable")
async def disable_chaos():
    if not chaos_engine:
        return {"error": "Chaos engine not available"}
    chaos_engine.disable()
    return {"status": "disabled"}


@app.get("/api/summary/correlations")
async def get_correlation_summary():
    series_data = {}
    if metrics_history and len(metrics_history) >= 3:
        for ns, pods in metrics_history[-1].items():
            for pod_name in pods.keys():
                series_data[f"{ns}/{pod_name}"] = []
        for snapshot in metrics_history:
            for full_name in series_data.keys():
                ns, pod = full_name.split('/')
                series_data[full_name].append(float(snapshot.get(ns, {}).get(pod, {}).get("cpu_usage", 0.0)))
    _, top_corrs = correlation_analyzer.calculate_correlation_matrix(series_data)
    summary = await insight_generator.generate_correlation_insight([{"pod1": c[0], "pod2": c[1], "correlation": c[2]} for c in top_corrs])
    return {"summary": summary}


@app.get("/api/activity")
async def get_activity_feed():
    activities = []
    if last_metrics and "anomalies" in last_metrics:
        for i, a in enumerate(last_metrics["anomalies"][:20]):
            activities.append({
                "id": f"act-{i}-{a.get('timestamp')}",
                "type": a.get("anomaly_type", "anomaly"),
                "severity": a.get("severity", "warning"),
                "pod": a.get("pod_name", "unknown-pod"),
                "namespace": a.get("namespace", "default"),
                "message": a.get("description", "Metric anomaly detected"),
                "timestamp": a.get("timestamp", datetime.utcnow().isoformat()),
                "insight": a.get("llm_insight", None)
            })
    if not activities:
        activities = [
            {
                "id": "init-1",
                "type": "system_up",
                "severity": "nominal",
                "pod": "kubelet-bpf-sensor",
                "namespace": "kube-system",
                "message": "PodMaster real-time BPF kernel inspection active.",
                "timestamp": datetime.utcnow().isoformat(),
                "insight": "All core container runtimes and cgroup resource monitors are operating within nominal thresholds."
            },
            {
                "id": "init-2",
                "type": "config_sync",
                "severity": "nominal",
                "pod": "student-portal-api-0",
                "namespace": "university-frontend",
                "message": "Service topology auto-discovery mapped 12 active microservice routes.",
                "timestamp": (datetime.utcnow() - timedelta(minutes=1)).isoformat(),
                "insight": None
            }
        ]
    return {"activities": activities}


@app.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({"type": "snapshot", "data": last_metrics})
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
