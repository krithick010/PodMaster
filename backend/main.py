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
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    ollama_model = os.getenv("OLLAMA_MODEL", "phi3.5:latest")
    insight_generator = InsightGenerator(ollama_url=ollama_url, model=ollama_model)
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

        # Add log metrics (simplified for now)
        log_metrics = {}
        for namespace, pods_data in pod_metrics.items():
            log_metrics[namespace] = {}
            for pod_name in pods_data.keys():
                log_metrics[namespace][pod_name] = {
                    "error_rate": 0.0,
                    "error_count": 0,
                    "warn_count": 0,
                    "crash_indicators": [],
                }

        agent_metrics["pod_metrics"] = {
            **agent_metrics["pod_metrics"],
            **{
                namespace: {
                    **pod_metrics.get(namespace, {}),
                    **{
                        pod_name: {
                            **pod_metrics.get(namespace, {}).get(pod_name, {}),
                            **log_metrics.get(namespace, {}).get(pod_name, {}),
                        }
                        for pod_name in log_metrics.get(namespace, {}).keys()
                    },
                }
                for namespace in log_metrics.keys()
            },
        }

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
    """Get actionable recommendations based on current anomalies."""
    if not last_metrics:
        return {"recommendations": []}

    anomalies = last_metrics.get("anomalies", [])
    recommendations = recommendation_engine.generate_recommendations(anomalies)
    recommendations = recommendation_engine.prioritize_recommendations(recommendations)

    return {"recommendations": recommendations}


@app.get("/api/forecast")
async def get_forecast(pod_name: str = Query(...)):
    """Get CPU/memory forecast for a pod."""
    if not db:
        return {"forecast": {}}

    history = await db.get_metrics_history(
        namespace="all",
        pod_name=pod_name,
        hours=1,
    )

    cpu_values = [h.cpu_usage for h in history]
    memory_values = [h.memory_usage for h in history]

    cpu_forecast = forecaster.forecast_cpu(cpu_values)
    memory_forecast = forecaster.forecast_memory(memory_values)

    return {
        "cpu_forecast": cpu_forecast,
        "memory_forecast": memory_forecast,
    }


@app.get("/api/correlations")
async def get_correlations():
    """Get cross-pod metric correlations."""
    if not last_metrics:
        return {"correlations": {}, "top_correlations": []}

    metrics = last_metrics.get("metrics", {})

    # Flatten all pod metrics
    pod_cpu_usage = {}
    for namespace, pods in metrics.items():
        for pod_name, pod_data in pods.items():
            full_pod_name = f"{namespace}/{pod_name}"
            pod_cpu_usage[full_pod_name] = float(pod_data.get("cpu_usage", 0))

    corr_matrix, top_corrs = correlation_analyzer.calculate_correlation_matrix(pod_cpu_usage)

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
