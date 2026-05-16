"""
KubeVision AI - Main FastAPI Application
Full-stack observability and AI agent platform for Kubernetes
"""

import asyncio
import csv
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from io import StringIO
from typing import Any, Dict, List, Optional, Set

from dotenv import load_dotenv
from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.orchestrator import AgentOrchestrator
from agents.agent_pipeline import run_agent_pipeline
from chaos_engine import ChaosEngine
from correlation import MetricCorrelationAnalyzer
from forecasting import ResourceForecaster
from llm.insight_generator import InsightGenerator
from metrics.k8s_client import KubernetesClient
from metrics.prometheus_client import PrometheusClient
from recommendations import RecommendationEngine
from storage.database import KubeVisionDB
from storage.models import AnomalyRecord, MetricsSnapshotRecord, StorageMetricsRecord

# Load environment variables
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
metrics_history: List[Dict[str, Any]] = []  # Temporal buffer for correlation analysis

# Agent pipeline globals
last_pipeline_result: Optional[Dict[str, Any]] = None
_pipeline_last_run: Optional[datetime] = None
_pipeline_cooldown_seconds: int = 30  # minimum gap between pipeline runs
_pipeline_running: bool = False        # prevent overlapping runs


def _should_run_pipeline() -> bool:
    """Return True if enough time has passed since the last pipeline run."""
    global _pipeline_last_run
    if _pipeline_running:
        return False
    if _pipeline_last_run is None:
        return True
    return (datetime.utcnow() - _pipeline_last_run).total_seconds() >= _pipeline_cooldown_seconds


async def _run_and_broadcast_pipeline(agent_metrics: Dict[str, Any]) -> None:
    """Run the multi-agent LLM pipeline and broadcast results over WebSocket."""
    global last_pipeline_result, _pipeline_last_run, _pipeline_running
    _pipeline_running = True
    _pipeline_last_run = datetime.utcnow()

    try:
        # Tell the frontend the pipeline is running so it can show a spinner
        await manager.broadcast({"type": "agent_pipeline_loading", "data": {"loading": True}})

        result = await run_agent_pipeline(agent_metrics)
        last_pipeline_result = result

        # Broadcast the full result
        await manager.broadcast({"type": "agent_pipeline", "data": result})
        print(f"✓ Agent pipeline completed — overall severity: {result.get('coordinator', {}).get('overall_severity', 'unknown')}")

    except RuntimeError as e:
        # OPENROUTER_API_KEY not set — log once, don't crash the collection loop
        print(f"⚠ Agent pipeline skipped: {e}")
        await manager.broadcast({"type": "agent_pipeline_loading", "data": {"loading": False}})
    except Exception as e:
        print(f"✗ Agent pipeline error: {e}")
        await manager.broadcast({"type": "agent_pipeline_loading", "data": {"loading": False}})
    finally:
        _pipeline_running = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup and shutdown."""
    global db, prometheus_client, k8s_client, orchestrator, insight_generator, chaos_engine

    # Startup
    print("🚀 KubeVision AI Starting Up...")

    # Initialize database
    db = KubeVisionDB(db_path=os.getenv("DB_PATH", "./kubevision.db"))
    await db.initialize()
    print("✓ Database initialized")

    # Initialize Prometheus client
    prometheus_client = PrometheusClient(
        prometheus_url=os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    )
    print("✓ Prometheus client initialized")

    # Initialize Kubernetes client
    k8s_client = KubernetesClient()
    print("✓ Kubernetes client initialized")

    # Initialize agent orchestrator
    orchestrator = AgentOrchestrator(db)
    print("✓ Agent orchestrator initialized")

    # Initialize LLM insight generator
    insight_generator = InsightGenerator()
    print("✓ LLM insight generator initialized")

    # Initialize chaos engine
    chaos_engine = ChaosEngine(auto_recover_seconds=90)
    print("✓ Chaos engine initialized")

    # Start background collection task
    collection_interval = int(os.getenv("COLLECTION_INTERVAL", "10"))
    background_task = asyncio.create_task(background_collection_loop(collection_interval))

    yield

    # Shutdown
    print("🛑 KubeVision AI Shutting Down...")
    background_task.cancel()


# Create FastAPI app
app = FastAPI(
    title="KubeVision AI",
    description="Kubernetes Observability and AI Agent Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Background collection loop
async def background_collection_loop(interval: int):
    """Continuously collect metrics and run agents."""
    while True:
        try:
            await collect_and_analyze()
        except Exception as e:
            print(f"Error in collection loop: {e}")

        await asyncio.sleep(interval)


async def collect_and_analyze():
    """Collect metrics and run all agents."""
    global last_metrics

    if not all([prometheus_client, k8s_client, orchestrator, db]):
        return

    try:
        # Collect metrics from Prometheus
        pod_metrics = await prometheus_client.get_pod_metrics_all_namespaces()
        pvc_metrics = await prometheus_client.get_pvc_metrics()

        # Collect K8s info
        pods_by_ns = await k8s_client.get_pods_all_namespaces()
        pending_pods = await k8s_client.get_pending_pods()
        node_conditions = await k8s_client.get_node_conditions()

        # Build metrics dict for agents
        agent_metrics = {
            "pod_metrics": pod_metrics,
            "pvc_metrics": pvc_metrics,
            "pending_pods": pending_pods,
        }

        # Add scheduling data
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

        # Fetch real log error rates from K8s pod logs
        log_metrics = await k8s_client.get_log_error_rates()

        # Merge log metrics into pod_metrics in-place.
        # Strategy: for every namespace/pod that has log data, patch those fields
        # into the existing pod_metrics entry so Prometheus data is never lost.
        # Pods with no log data (not Running, RBAC denied, etc.) keep their
        # Prometheus metrics untouched with zeroed log fields as defaults.
        merged_pod_metrics: Dict[str, Any] = {}
        all_namespaces = set(list(pod_metrics.keys()) + list(log_metrics.keys()))

        for ns in all_namespaces:
            merged_pod_metrics[ns] = {}
            prom_ns = pod_metrics.get(ns, {})
            log_ns = log_metrics.get(ns, {})
            all_pods = set(list(prom_ns.keys()) + list(log_ns.keys()))

            for pod in all_pods:
                prom_data = dict(prom_ns.get(pod, {}))
                log_data = log_ns.get(pod, {
                    "error_rate": 0.0,
                    "error_count": 0,
                    "warn_count": 0,
                    "crash_indicators": [],
                })
                # log_data fields overwrite only their own keys; Prometheus fields stay
                merged_pod_metrics[ns][pod] = {**prom_data, **log_data}

        agent_metrics["pod_metrics"] = merged_pod_metrics

        # Run all agents
        agent_results = await orchestrator.run_all_agents(agent_metrics)
        all_findings = orchestrator.get_all_findings()

        # Add injected anomalies from chaos engine
        if chaos_engine:
            active_chaos = chaos_engine.get_active_anomalies()
            
            # Resolve pod prefixes to full names and inject fake metrics
            for chaos in active_chaos:
                ns = chaos.namespace
                pod_prefix = chaos.pod_name  # original short name (never mutate this)
                
                # Find the full pod name matching the prefix
                actual_pod = pod_prefix
                if ns in pod_metrics:
                    for name in pod_metrics[ns].keys():
                        if name.startswith(pod_prefix):
                            actual_pod = name
                            break
                
                # Inject fake metric values into prometheus data
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
                    elif chaos.anomaly_type == "NETWORK_CRITICAL_OUT":
                        m["network_out"] = chaos.metrics.get("network_mb_per_sec", 100) * 1024 * 1024
                
                # Create a COPY of the anomaly with the resolved pod name (do NOT mutate the original)
                from copy import copy as _copy
                resolved = _copy(chaos)
                resolved.pod_name = actual_pod
                all_findings.append(resolved)

        # Generate LLM insights
        for anomaly in all_findings:
            if insight_generator and not anomaly.llm_insight:
                anomaly.llm_insight = await insight_generator.generate_insight(anomaly)
                # Persist to database
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

        # Persist metrics snapshots
        for namespace, pods in pod_metrics.items():
            for pod_name, metrics in pods.items():
                try:
                    await db.insert_metrics_snapshot(
                        MetricsSnapshotRecord(
                            timestamp=datetime.utcnow(),
                            namespace=namespace,
                            pod_name=pod_name,
                            cpu_usage=float(metrics.get("cpu_usage", 0)),
                            cpu_limit=float(metrics.get("cpu_limit", 0)),
                            memory_usage=float(metrics.get("memory_usage", 0)),
                            memory_limit=float(metrics.get("memory_limit", 0)),
                            restart_count=int(metrics.get("restart_count", 0)),
                            error_rate=float(metrics.get("error_rate", 0)),
                            network_in_bytes=float(metrics.get("network_in", 0)),
                            network_out_bytes=float(metrics.get("network_out", 0)),
                        )
                    )
                except Exception as e:
                    print(f"Error persisting metrics: {e}")

        # Persist PVC metrics
        for pvc_key, pvc_data in pvc_metrics.items():
            try:
                await db.insert_storage_metrics(
                    StorageMetricsRecord(
                        timestamp=datetime.utcnow(),
                        namespace=pvc_data.get("namespace", ""),
                        pod_name=pvc_data.get("pod_name", ""),
                        pvc_name=pvc_data.get("pvc_name", ""),
                        capacity_bytes=float(pvc_data.get("capacity_bytes", 0)),
                        used_bytes=float(pvc_data.get("used_bytes", 0)),
                        available_bytes=float(pvc_data.get("available_bytes", 0)),
                        usage_percentage=float(pvc_data.get("usage_percentage", 0)),
                    )
                )
            except Exception as e:
                print(f"Error persisting storage metrics: {e}")

        # Update last metrics and broadcast
        last_metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "metrics": pod_metrics,
            "pvc_metrics": pvc_metrics,
            "anomalies": [a.to_dict() for a in all_findings],
            "agent_status": orchestrator.get_agent_statuses(),
        }

        # Broadcast snapshot to WebSocket clients
        await manager.broadcast({
            "type": "snapshot",
            "data": last_metrics,
        })

        # Slow path — LLM pipeline fires only when there are findings and cooldown has passed
        if all_findings and _should_run_pipeline():
            asyncio.create_task(_run_and_broadcast_pipeline(agent_metrics))

        # Append to temporal history (keep last 30 snapshots ~5 mins)
        metrics_history.append(pod_metrics)
        if len(metrics_history) > 30:
            metrics_history.pop(0)

    except Exception as e:
        print(f"Error in collect_and_analyze: {e}")


# REST Endpoints

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "db_ready": db is not None,
        "prometheus_ready": prometheus_client is not None,
        "k8s_ready": k8s_client is not None,
    }


@app.get("/api/namespaces")
async def get_namespaces():
    """Get all discovered namespaces."""
    if not k8s_client:
        return {"namespaces": []}

    namespaces = await k8s_client.get_all_namespaces()
    return {"namespaces": namespaces}


@app.get("/api/metrics/current")
async def get_current_metrics(namespace: str = Query("all")):
    """Get current metrics for all pods (optionally filtered by namespace)."""
    if not last_metrics:
        return {"metrics": {}, "timestamp": None}

    metrics = last_metrics.get("metrics", {})

    if namespace != "all":
        metrics = {namespace: metrics.get(namespace, {})}

    return {
        "metrics": metrics,
        "timestamp": last_metrics.get("timestamp"),
    }


@app.get("/api/anomalies/current")
async def get_current_anomalies(namespace: str = Query("all"), severity: str = Query("all")):
    """Get current anomalies."""
    if not last_metrics:
        return {"anomalies": []}

    anomalies = last_metrics.get("anomalies", [])

    if namespace != "all":
        anomalies = [a for a in anomalies if a.get("namespace") == namespace]

    if severity != "all":
        anomalies = [a for a in anomalies if a.get("severity") == severity]

    return {"anomalies": anomalies}


@app.get("/api/anomalies/history")
async def get_anomaly_history(
    hours: int = Query(24),
    namespace: str = Query(None),
    severity: str = Query(None),
):
    """Get historical anomalies from database."""
    if not db:
        return {"anomalies": []}

    anomalies = await db.get_anomalies(
        hours=hours,
        namespace=namespace,
        severity=severity,
    )

    return {
        "anomalies": [a.to_dict() for a in anomalies],
        "count": len(anomalies),
    }


@app.get("/api/anomalies/export")
async def export_anomalies(hours: int = Query(24)):
    """Export anomalies as CSV."""
    if not db:
        return {"error": "Database not available"}

    anomalies = await db.get_anomalies(hours=hours)

    # Create CSV
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp", "Namespace", "Pod Name", "Anomaly Type",
        "Severity", "Description", "Agent", "LLM Insight"
    ])

    for anomaly in anomalies:
        writer.writerow([
            anomaly.timestamp.isoformat() if anomaly.timestamp else "",
            anomaly.namespace,
            anomaly.pod_name,
            anomaly.anomaly_type,
            anomaly.severity,
            anomaly.description,
            anomaly.agent_name,
            anomaly.llm_insight or "",
        ])

    # Return as downloadable CSV
    def iterfile():
        yield output.getvalue()

    return StreamingResponse(
        iterfile(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=anomalies.csv"},
    )


@app.get("/api/storage")
async def get_storage_metrics(namespace: str = Query("all")):
    """Get PVC storage metrics."""
    if not last_metrics:
        return {"storage": {}}

    storage = last_metrics.get("pvc_metrics", {})

    if namespace != "all":
        storage = {k: v for k, v in storage.items() if v.get("namespace") == namespace}

    return {"storage": storage}


@app.get("/api/agents/status")
async def get_agent_status():
    """Get live status of all agents."""
    if not orchestrator:
        return {"agents": []}

    return {
        "agents": orchestrator.get_agent_statuses(),
        "summary": orchestrator.get_status_summary(),
    }


@app.get("/api/pipeline/analysis")
async def get_pipeline_analysis():
    """Get the latest multi-agent LLM pipeline analysis result."""
    if not last_pipeline_result:
        return {"status": "pending", "message": "No pipeline run completed yet. Trigger a chaos event or wait for anomalies."}
    return last_pipeline_result


@app.get("/api/dependencies")
async def get_dependencies():
    """Get cross-namespace dependency graph."""
    # Simplified: return pod names grouped by namespace
    if not last_metrics:
        return {"dependencies": {}}

    metrics = last_metrics.get("metrics", {})
    dependencies = {}

    for namespace, pods in metrics.items():
        dependencies[namespace] = list(pods.keys())

    return {"dependencies": dependencies}


@app.get("/api/recommendations")
async def get_recommendations():
    """Get AI-generated remediation recommendations via OpenRouter."""
    if not last_metrics:
        return {"recommendations": []}

    anomalies = last_metrics.get("anomalies", [])
    # Call the async AI recommendation generator
    recs = await recommendation_engine.generate_ai_recommendations(anomalies)
    sorted_recs = recommendation_engine.prioritize_recommendations(recs)

    return {"recommendations": sorted_recs}


@app.get("/api/forecast")
async def get_forecast(pod_name: str = Query("result-service-0")):
    """Get CPU/memory forecast for a pod using EWMA + polynomial fitting."""
    if not db:
        return {"cpu_forecast": _empty_forecast(), "memory_forecast": _empty_forecast()}

    history = await db.get_metrics_history(
        namespace="all",
        pod_name=pod_name,
        hours=2,
    )

    cpu_values = [h.cpu_usage for h in history]
    memory_values = [h.memory_usage for h in history]

    # Seed with live current metrics when history is thin (< 5 points)
    if len(cpu_values) < 5 and last_metrics:
        for ns, pods in last_metrics.get("metrics", {}).items():
            for pname, pdata in pods.items():
                if pod_name in pname or pname in pod_name:
                    live_cpu = pdata.get("cpu_usage", 0)
                    live_mem = pdata.get("memory_usage", 0)
                    # Synthesize a short stable baseline
                    cpu_values = [live_cpu * (0.9 + 0.1 * i / 5) for i in range(5)] + cpu_values
                    memory_values = [live_mem * (0.92 + 0.08 * i / 5) for i in range(5)] + memory_values
                    break

    cpu_result = forecaster.forecast_cpu(cpu_values)
    memory_result = forecaster.forecast_memory(memory_values)

    def _shape(result, raw_values):
        smoothed = result.get("history_smoothed", raw_values[-10:] if raw_values else [])
        predicted = result.get("forecast", [])
        trend_map = {"increasing": "up", "decreasing": "down", "stable": "stable", "insufficient_data": "stable", "error": "stable"}
        return {
            "historical": smoothed[-20:],   # last 20 points
            "predicted": predicted,
            "trend": trend_map.get(result.get("trend", "stable"), "stable"),
            "current": result.get("current", 0),
            "confidence": 0.85,
        }

    return {
        "cpu_forecast": _shape(cpu_result, cpu_values),
        "memory_forecast": _shape(memory_result, memory_values),
    }


def _empty_forecast():
    return {"historical": [], "predicted": [], "trend": "stable", "current": 0, "confidence": 0}


@app.get("/api/correlations")
async def get_correlations():
    """Get cross-pod metric correlations based on historical trends."""
    if not metrics_history or len(metrics_history) < 3:
        return {"correlations": {}, "top_correlations": []}

    # Transpose history: List of snapshots -> Dict of lists [pod_name: [v1, v2, ...]]
    series_data = {}
    
    # Use the most recent snapshot to get the current list of pods
    latest = metrics_history[-1]
    for ns, pods in latest.items():
        for pod_name in pods.keys():
            series_data[f"{ns}/{pod_name}"] = []

    # Fill series data from history
    for snapshot in metrics_history:
        for full_name in series_data.keys():
            ns, pod = full_name.split('/')
            val = snapshot.get(ns, {}).get(pod, {}).get("cpu_usage", 0.0)
            series_data[full_name].append(float(val))

    corr_matrix, top_corrs = correlation_analyzer.calculate_correlation_matrix(series_data)

    return {
        "correlations": corr_matrix,
        "top_correlations": [
            {
                "pod1": c[0],
                "pod2": c[1],
                "correlation": c[2],
            }
            for c in top_corrs
        ],
    }


@app.get("/api/health-score")
@app.get("/api/summary/health")
async def get_health_summary():
    """Get overall cluster health summary."""
    if not last_metrics:
        return {"health_score": 0, "summary": {}}

    anomalies = last_metrics.get("anomalies", [])
    agent_status = last_metrics.get("agent_status", [])

    # Calculate health score (0-100)
    critical_count = sum(1 for a in anomalies if a.get("severity") == "critical")
    warning_count = sum(1 for a in anomalies if a.get("severity") == "warning")

    health_score = max(0, 100 - (critical_count * 10 + warning_count * 3))

    # Grade system
    if health_score >= 90:
        grade = "A"
    elif health_score >= 80:
        grade = "B"
    elif health_score >= 70:
        grade = "C"
    elif health_score >= 60:
        grade = "D"
    else:
        grade = "F"

    return {
        "health_score": health_score,
        "grade": grade,
        "critical_anomalies": critical_count,
        "warning_anomalies": warning_count,
        "agents_active": len([a for a in agent_status if a.get("status") == "running"]),
    }


@app.post("/api/simulate/cpu-spike")
async def simulate_cpu_spike(pod_name: str = Query("result-service"), namespace: str = Query("university-backend")):
    """Simulate a CPU spike."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    chaos_engine.enable()
    anomaly = chaos_engine.inject_cpu_spike(pod_name, namespace, percentage=98.0)

    return {
        "status": "injected",
        "anomaly": anomaly.to_dict(),
    }


@app.post("/api/simulate/memory-leak")
async def simulate_memory_leak(pod_name: str = Query("student-portal"), namespace: str = Query("university-frontend")):
    """Simulate a memory leak."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    chaos_engine.enable()
    anomaly = chaos_engine.inject_memory_leak(pod_name, namespace, percentage=94.0)

    return {
        "status": "injected",
        "anomaly": anomaly.to_dict(),
    }


@app.post("/api/simulate/storage-pressure")
async def simulate_storage_pressure(
    pod_name: str = Query("attendance-service"),
    namespace: str = Query("university-backend"),
):
    """Simulate storage pressure."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    chaos_engine.enable()
    anomaly = chaos_engine.inject_storage_pressure(
        pod_name,
        namespace,
        pvc_name="attendance-storage",
        percentage=93.0,
    )

    return {
        "status": "injected",
        "anomaly": anomaly.to_dict(),
    }


@app.post("/api/simulate/log-flood")
async def simulate_log_flood(pod_name: str = Query("notification-service"), namespace: str = Query("university-frontend")):
    """Simulate a log error flood."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    chaos_engine.enable()
    anomaly = chaos_engine.inject_log_flood(pod_name, namespace, error_rate=3.5)

    return {
        "status": "injected",
        "anomaly": anomaly.to_dict(),
    }


@app.post("/api/simulate/network-spike")
async def simulate_network_spike(pod_name: str = Query("result-service"), namespace: str = Query("university-backend")):
    """Simulate a network traffic spike."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    chaos_engine.enable()
    anomaly = chaos_engine.inject_network_spike(pod_name, namespace, mb_per_sec=120.0)

    return {
        "status": "injected",
        "anomaly": anomaly.to_dict(),
    }



@app.get("/api/chaos/status")
async def get_chaos_status():
    """Get chaos engine status."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    return chaos_engine.get_status()

@app.get("/api/chaos/scenarios")
async def get_chaos_scenarios():
    """Get list of chaos scenarios."""
    return {
        "scenarios": [
            {"id": "cpu-spike", "name": "CPU Spike", "duration": "2m", "severity": "critical", "type": "CPU_CRITICAL"},
            {"id": "memory-leak", "name": "Memory Leak", "duration": "3m", "severity": "critical", "type": "MEMORY_CRITICAL"},
            {"id": "storage-pressure", "name": "Storage Pressure", "duration": "5m", "severity": "warning", "type": "STORAGE_WARNING"},
            {"id": "network-spike", "name": "Network Spike", "duration": "2m", "severity": "warning", "type": "NETWORK_WARNING"},
            {"id": "log-flood", "name": "Log Error Flood", "duration": "1m", "severity": "critical", "type": "LOG_CRITICAL"}
        ]
    }

@app.post("/api/chaos/inject")
async def inject_chaos(
    pod_name: str = Query(...),
    namespace: str = Query(...),
    anomaly_type: str = Query(...)
):
    """Generic endpoint to inject chaos."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}
    
    chaos_engine.enable()
    
    # Simple mapping
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


@app.post("/api/chaos/enable")
async def enable_chaos():
    """Enable chaos engine."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    chaos_engine.enable()
    return {"status": "enabled"}


@app.post("/api/chaos/disable")
async def disable_chaos():
    """Disable chaos engine."""
    if not chaos_engine:
        return {"error": "Chaos engine not available"}

    chaos_engine.disable()
    return {"status": "disabled"}

@app.get("/api/events/config")
async def get_config_events(hours: int = Query(1)):
    """Mock endpoint for config events history."""
    return {"events": []}

@app.get("/api/signals/golden")
async def get_golden_signals():
    """Get cluster golden signals using real prometheus queries."""
    if not prometheus_client:
         return {"throughput": 0, "errorRate": 0, "latency": 0, "status": "unavailable"}
    
    try:
        # Example queries, fallback to 0 if no results or failure
        tp_res = await prometheus_client.query("sum(rate(container_network_receive_bytes_total[5m])) / 1024 / 1024")
        throughput = float(tp_res[0]["value"][1]) if tp_res and len(tp_res) > 0 else 0.0
        
        er_res = await prometheus_client.query("sum(rate(kube_pod_container_status_restarts_total[5m])) * 100")
        error_rate = float(er_res[0]["value"][1]) if er_res and len(er_res) > 0 else 0.0
        
        latency = 45.0 + (throughput * 0.1)
        
        status = "healthy"
        if error_rate > 5 or throughput > 1000:
             status = "critical"
        elif error_rate > 1 or throughput > 500:
             status = "warning"
             
        return {
             "throughput": throughput,
             "errorRate": error_rate,
             "latency": latency,
             "status": status,
             "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error fetching golden signals: {e}")
        return {"throughput": 0, "errorRate": 0, "latency": 0, "status": "error"}

@app.get("/api/llm/stats")
async def get_llm_stats():
    """Get operational stats for the AI subsystem."""
    # Simplified stats for demonstration
    return {
         "status": "online",
         "model": os.getenv("OLLAMA_MODEL", "phi3.5:latest"),
         "total_calls": 142,
         "average_latency_ms": 1245,
         "last_call_seconds_ago": 15
    }

@app.get("/api/activity")
async def get_activity_feed():
    """Get recent operational activity."""
    if not db:
        return {"activities": []}
    
    anomalies = await db.get_anomalies(hours=2)
    activities = []
    seen = set()
    
    for a in anomalies:
        # Deduplicate by pod and message to prevent spam from repeated agent findings
        dedup_key = f"{a.pod_name}-{a.description}"
        if dedup_key in seen:
            continue
        seen.add(dedup_key)
        
        activities.append({
            "id": f"{a.timestamp.timestamp()}-{a.pod_name}-{len(activities)}",
            "type": "anomaly",
            "severity": a.severity,
            "message": a.description,
            "pod": a.pod_name,
            "timestamp": a.timestamp.isoformat(),
            "insight": a.llm_insight[:100] + "..." if a.llm_insight else None
        })
        
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"activities": activities[:20]}

@app.post("/api/query")
async def ai_query(query: str = Query(...)):
    """Process an AI query using OpenRouter cluster intelligence."""
    start_time = datetime.utcnow()
    
    # Get current context
    context = {
        "anomalies": last_metrics.get("anomalies", []) if last_metrics else []
    }
    
    # Call the AI engine
    answer = await insight_generator.ask_podmaster(query, context)
    generation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
    
    return {
        "answer": answer,
        "generation_time_ms": int(generation_time)
    }

@app.get("/api/summary/correlations")
async def get_correlation_summary():
    """Explain significant correlations using AI via OpenRouter."""
    # Get current correlations first
    series_data = {}
    if metrics_history and len(metrics_history) >= 3:
        latest = metrics_history[-1]
        for ns, pods in latest.items():
            for pod_name in pods.keys():
                series_data[f"{ns}/{pod_name}"] = []
        for snapshot in metrics_history:
            for full_name in series_data.keys():
                ns, pod = full_name.split('/')
                val = snapshot.get(ns, {}).get(pod, {}).get("cpu_usage", 0.0)
                series_data[full_name].append(float(val))

    _, top_corrs = correlation_analyzer.calculate_correlation_matrix(series_data)
    
    # Format for AI
    formatted_corrs = [
        {"pod1": c[0], "pod2": c[1], "correlation": c[2]}
        for c in top_corrs
    ]
    
    summary = await insight_generator.generate_correlation_insight(formatted_corrs)
    return {"summary": summary}


# WebSocket endpoint
@app.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await manager.connect(websocket)

    try:
        # Send initial snapshot
        await websocket.send_json({
            "type": "snapshot",
            "data": last_metrics,
        })

        # Keep connection alive and relay any client messages (for future extensions)
        while True:
            data = await websocket.receive_text()
            # Could handle client commands here if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
