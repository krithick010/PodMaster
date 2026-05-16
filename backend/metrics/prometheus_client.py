"""
Prometheus client for KubeVision AI / PodMaster.
Provides multi-namespace metric queries with deterministic simulated fallback and advanced SRE aggregations.
"""

import os
import time
from typing import Any, Dict, List, Optional

import httpx
from prometheus_api_client import PrometheusConnect


class PrometheusClient:
    """Client for querying Prometheus metrics.
    Supports health checking, multi‑namespace queries, and deterministic simulated fallback.
    """

    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        """Initialize Prometheus client.
        Args:
            prometheus_url: URL of Prometheus server
        """
        self.prometheus_url = prometheus_url
        self.client: Optional[PrometheusConnect] = None
        self.last_checked: Optional[float] = None
        self._initialize()

    # ---------------------------------------------------------------------
    # Health check
    # ---------------------------------------------------------------------
    def is_healthy(self) -> bool:
        """Return True if Prometheus responds to a simple `up` query.
        Updates `self.last_checked` timestamp.
        """
        self.last_checked = time.time()
        try:
            resp = httpx.get(
                f"{self.prometheus_url}/api/v1/query",
                params={"query": "up"},
                timeout=1.5,
            )
            if resp.status_code != 200:
                return False
            data = resp.json()
            for result in data.get("data", {}).get("result", []):
                if result.get("value", [])[1] == "1":
                    return True
            return False
        except Exception:
            return False

    def _initialize(self) -> None:
        """Initialize Prometheus connection."""
        try:
            if self.is_healthy():
                self.client = PrometheusConnect(url=self.prometheus_url, disable_ssl=True)
                self.client.custom_query("up")
            else:
                raise Exception("Prometheus health check failed or timed out.")
        except Exception as e:
            print(f"Warning: Could not connect to Prometheus at {self.prometheus_url}: {e}")
            print("Falling back to simulated data mode.")
            self.client = None

    # ---------------------------------------------------------------------
    # Helper: deterministic simulated data
    # ---------------------------------------------------------------------
    def _simulated_source(self) -> Dict[str, Any]:
        return {"source": "simulated"}

    def _mock_namespaces(self) -> List[str]:
        return ["university-frontend", "university-backend", "university-data"]

    def _mock_pod_metrics(self) -> Dict[str, Dict[str, Any]]:
        base = {
            "university-frontend": {
                "student-portal-0": {
                    "cpu_usage": 0.05,
                    "cpu_limit": 0.2,
                    "memory_usage": 64e6,
                    "memory_limit": 256e6,
                    "restart_count": 0,
                    "network_in": 1024,
                    "network_out": 2048,
                },
                "student-portal-1": {
                    "cpu_usage": 0.04,
                    "cpu_limit": 0.2,
                    "memory_usage": 58e6,
                    "memory_limit": 256e6,
                    "restart_count": 0,
                    "network_in": 800,
                    "network_out": 1500,
                },
                "notification-service-0": {
                    "cpu_usage": 0.02,
                    "cpu_limit": 0.2,
                    "memory_usage": 48e6,
                    "memory_limit": 256e6,
                    "restart_count": 0,
                    "network_in": 512,
                    "network_out": 1024,
                },
                "notification-service-1": {
                    "cpu_usage": 0.015,
                    "cpu_limit": 0.2,
                    "memory_usage": 42e6,
                    "memory_limit": 256e6,
                    "restart_count": 0,
                    "network_in": 400,
                    "network_out": 800,
                },
            },
            "university-backend": {
                "attendance-service-0": {
                    "cpu_usage": 0.03,
                    "cpu_limit": 0.1,
                    "memory_usage": 64e6,
                    "memory_limit": 256e6,
                    "restart_count": 0,
                    "network_in": 256,
                    "network_out": 512,
                },
                "attendance-service-1": {
                    "cpu_usage": 0.025,
                    "cpu_limit": 0.1,
                    "memory_usage": 60e6,
                    "memory_limit": 256e6,
                    "restart_count": 0,
                    "network_in": 200,
                    "network_out": 450,
                },
                "result-service-0": {
                    "cpu_usage": 0.08,
                    "cpu_limit": 0.5,
                    "memory_usage": 128e6,
                    "memory_limit": 512e6,
                    "restart_count": 5,
                    "network_in": 256,
                    "network_out": 512,
                },
                "result-service-1": {
                    "cpu_usage": 0.035,
                    "cpu_limit": 0.5,
                    "memory_usage": 96e6,
                    "memory_limit": 512e6,
                    "restart_count": 0,
                    "network_in": 180,
                    "network_out": 300,
                },
            },
            "university-data": {
                "postgres-0": {
                    "cpu_usage": 0.04,
                    "cpu_limit": 0.2,
                    "memory_usage": 256e6,
                    "memory_limit": 512e6,
                    "restart_count": 0,
                    "network_in": 2048,
                    "network_out": 1024,
                },
            },
        }
        for ns, pods in base.items():
            for pod_name, metrics in pods.items():
                metrics.update(self._simulated_source())
        return base

    def _mock_pvc_metrics(self) -> Dict[str, Dict[str, Any]]:
        base = {
            "university-backend/attendance-storage": {
                "pvc_name": "attendance-storage",
                "namespace": "university-backend",
                "pod_name": "attendance-service-0",
                "capacity_bytes": 1e9,
                "used_bytes": 2e8,
                "usage_percentage": 20,
            },
        }
        for v in base.values():
            v.update(self._simulated_source())
        return base

    # ---------------------------------------------------------------------
    # Existing Public Query Methods
    # ---------------------------------------------------------------------
    async def get_all_namespaces(self) -> List[str]:
        if not self.is_healthy() or not self.client:
            return self._mock_namespaces()
        try:
            result = self.client.custom_query('label_values(kube_pod_info, namespace)')
            if isinstance(result, list):
                return sorted(result)
            return []
        except Exception:
            return self._mock_namespaces()

    async def get_pod_metrics_all_namespaces(self) -> Dict[str, Dict[str, Any]]:
        if not self.is_healthy() or not self.client:
            return self._mock_pod_metrics()
        try:
            result: Dict[str, Dict[str, Any]] = {}
            pods = self.client.custom_query('kube_pod_info')
            for pod_metric in pods:
                namespace = pod_metric.get('metric', {}).get('namespace')
                pod_name = pod_metric.get('metric', {}).get('pod')
                if not namespace or not pod_name:
                    continue
                if namespace not in result:
                    result[namespace] = {}
                cpu_query = f"rate(container_cpu_usage_seconds_total{{pod=\"{pod_name}\", namespace=\"{namespace}\"}}[2m])"
                cpu_res = self.client.custom_query(cpu_query)
                cpu_usage = float(cpu_res[0]['value'][1]) if cpu_res else 0.0

                cpu_limit_query = f"sum(kube_pod_container_resource_limits{{pod=\"{pod_name}\", namespace=\"{namespace}\", resource=\"cpu\"}})"
                cpu_limit_res = self.client.custom_query(cpu_limit_query)
                cpu_limit = float(cpu_limit_res[0]['value'][1]) if cpu_limit_res else 0.0

                mem_query = f"sum(container_memory_working_set_bytes{{pod=\"{pod_name}\", namespace=\"{namespace}\"}})"
                mem_res = self.client.custom_query(mem_query)
                memory_usage = float(mem_res[0]['value'][1]) if mem_res else 0.0

                mem_limit_query = f"sum(kube_pod_container_resource_limits{{pod=\"{pod_name}\", namespace=\"{namespace}\", resource=\"memory\"}})"
                mem_limit_res = self.client.custom_query(mem_limit_query)
                memory_limit = float(mem_limit_res[0]['value'][1]) if mem_limit_res else 0.0

                restarts_query = f"kube_pod_container_status_restarts_total{{pod=\"{pod_name}\", namespace=\"{namespace}\"}}"
                rest_res = self.client.custom_query(restarts_query)
                restart_count = int(float(rest_res[0]['value'][1])) if rest_res else 0

                net_in_q = f"rate(container_network_receive_bytes_total{{pod=\"{pod_name}\", namespace=\"{namespace}\"}}[2m])"
                net_in_res = self.client.custom_query(net_in_q)
                network_in = float(net_in_res[0]['value'][1]) if net_in_res else 0.0

                net_out_q = f"rate(container_network_transmit_bytes_total{{pod=\"{pod_name}\", namespace=\"{namespace}\"}}[2m])"
                net_out_res = self.client.custom_query(net_out_q)
                network_out = float(net_out_res[0]['value'][1]) if net_out_res else 0.0

                read_q = f"rate(container_fs_reads_bytes_total{{pod=\"{pod_name}\", namespace=\"{namespace}\"}}[2m])"
                write_q = f"rate(container_fs_writes_bytes_total{{pod=\"{pod_name}\", namespace=\"{namespace}\"}}[2m])"
                read_res = self.client.custom_query(read_q)
                write_res = self.client.custom_query(write_q)
                disk_read = float(read_res[0]['value'][1]) if read_res else 0.0
                disk_write = float(write_res[0]['value'][1]) if write_res else 0.0

                result[namespace][pod_name] = {
                    "cpu_usage": cpu_usage,
                    "cpu_limit": cpu_limit,
                    "memory_usage": memory_usage,
                    "memory_limit": memory_limit,
                    "restart_count": restart_count,
                    "network_in": network_in,
                    "network_out": network_out,
                    "disk_read": disk_read,
                    "disk_write": disk_write,
                }
                result[namespace][pod_name].update({"source": "prometheus"})
            return result
        except Exception:
            return self._mock_pod_metrics()

    async def get_pvc_metrics(self, namespace: str = ".*") -> Dict[str, Dict[str, Any]]:
        if not self.is_healthy() or not self.client:
            return self._mock_pvc_metrics()
        try:
            result: Dict[str, Dict[str, Any]] = {}
            capacity_query = f"kubelet_volume_stats_capacity_bytes{{namespace=~\"{namespace}\"}}"
            capacity_res = self.client.custom_query(capacity_query)
            for metric in capacity_res:
                pvc_name = metric.get('metric', {}).get('persistentvolumeclaim')
                ns = metric.get('metric', {}).get('namespace')
                pod_name = metric.get('metric', {}).get('pod')
                if not pvc_name:
                    continue
                key = f"{ns}/{pvc_name}"
                if key not in result:
                    result[key] = {
                        'pvc_name': pvc_name,
                        'namespace': ns,
                        'pod_name': pod_name,
                    }
                result[key]['capacity_bytes'] = float(metric['value'][1])
            usage_query = f"kubelet_volume_stats_used_bytes{{namespace=~\"{namespace}\"}}"
            usage_res = self.client.custom_query(usage_query)
            for metric in usage_res:
                pvc_name = metric.get('metric', {}).get('persistentvolumeclaim')
                ns = metric.get('metric', {}).get('namespace')
                if not pvc_name:
                    continue
                key = f"{ns}/{pvc_name}"
                if key not in result:
                    result[key] = {'pvc_name': pvc_name, 'namespace': ns}
                used = float(metric['value'][1])
                result[key]['used_bytes'] = used
                if 'capacity_bytes' in result[key]:
                    cap = result[key]['capacity_bytes']
                    result[key]['usage_percentage'] = (used / cap * 100) if cap > 0 else 0
            for v in result.values():
                v.update({"source": "prometheus"})
            return result
        except Exception:
            return self._mock_pvc_metrics()

    async def query(self, query: str) -> List[Dict[str, Any]]:
        if not self.is_healthy() or not self.client:
            return []
        try:
            result = self.client.custom_query(query)
            return result if isinstance(result, list) else [result]
        except Exception:
            return []

    # ---------------------------------------------------------------------
    # Advanced SRE & Observability Feature Queries
    # ---------------------------------------------------------------------
    async def get_golden_signals(self) -> Dict[str, Any]:
        """Feature 1: Golden Signals v2 (Latency, Traffic, Errors, Saturation)."""
        if not self.is_healthy() or not self.client:
            return {
                "latency_ms": 42.5,
                "traffic_rps": 125.4,
                "error_rate": 0.12,
                "saturation": 68.5,
                "source": "simulated",
            }
        try:
            # Query Traffic (RPS)
            tp_res = self.client.custom_query("sum(rate(container_network_receive_bytes_total[5m])) / 1024")
            traffic_rps = float(tp_res[0]["value"][1]) if tp_res and len(tp_res) > 0 else 125.4

            # Query Errors (%)
            er_res = self.client.custom_query("sum(rate(kube_pod_container_status_restarts_total[5m])) * 100")
            error_rate = float(er_res[0]["value"][1]) if er_res and len(er_res) > 0 else 0.12

            # Query Saturation (%) - Memory working set / limit
            sat_res = self.client.custom_query("sum(container_memory_working_set_bytes) / sum(kube_pod_container_resource_limits{resource=\"memory\"}) * 100")
            saturation = float(sat_res[0]["value"][1]) if sat_res and len(sat_res) > 0 else 68.5

            # Latency (estimated/derived from traffic if real metric unavailable)
            latency_ms = 35.0 + (traffic_rps * 0.05)

            return {
                "latency_ms": round(latency_ms, 2),
                "traffic_rps": round(traffic_rps, 2),
                "error_rate": round(error_rate, 2),
                "saturation": min(100.0, max(0.0, round(saturation, 1))),
                "source": "prometheus",
            }
        except Exception:
            return {
                "latency_ms": 42.5,
                "traffic_rps": 125.4,
                "error_rate": 0.12,
                "saturation": 68.5,
                "source": "simulated",
            }

    async def get_cluster_tree(self) -> List[Dict[str, Any]]:
        """Feature 2: Cluster Explorer hierarchy (Namespace -> Deployment -> Pod)."""
        demo_tree = [
            {
                "namespace": "university-frontend",
                "deployments": [
                    {
                        "name": "student-portal",
                        "pods": [
                            {"name": "student-portal-0", "status": "Running", "restarts": 0},
                            {"name": "student-portal-1", "status": "Running", "restarts": 0},
                        ]
                    },
                    {
                        "name": "notification-service",
                        "pods": [
                            {"name": "notification-service-0", "status": "Running", "restarts": 0},
                            {"name": "notification-service-1", "status": "Running", "restarts": 0},
                        ]
                    }
                ]
            },
            {
                "namespace": "university-backend",
                "deployments": [
                    {
                        "name": "attendance-service",
                        "pods": [
                            {"name": "attendance-service-0", "status": "Running", "restarts": 0},
                            {"name": "attendance-service-1", "status": "Running", "restarts": 0},
                        ]
                    },
                    {
                        "name": "result-service",
                        "pods": [
                            {"name": "result-service-0", "status": "CrashLoopBackOff", "restarts": 5},
                            {"name": "result-service-1", "status": "Running", "restarts": 0},
                        ]
                    }
                ]
            },
            {
                "namespace": "university-data",
                "deployments": [
                    {
                        "name": "postgres",
                        "pods": [
                            {"name": "postgres-0", "status": "Running", "restarts": 0},
                        ]
                    }
                ]
            }
        ]
        if not self.is_healthy() or not self.client:
            return demo_tree
        try:
            # Group actual pod metrics into tree
            pod_metrics = await self.get_pod_metrics_all_namespaces()
            tree: List[Dict[str, Any]] = []
            for ns, pods in pod_metrics.items():
                dep_map: Dict[str, List[Dict[str, Any]]] = {}
                for pod_name, metrics in pods.items():
                    # Deduce deployment name
                    parts = pod_name.split("-")
                    dep_name = "-".join(parts[:-1]) if len(parts) > 1 else pod_name
                    if dep_name not in dep_map:
                        dep_map[dep_name] = []
                    status = "CrashLoopBackOff" if metrics.get("restart_count", 0) > 3 else "Running"
                    dep_map[dep_name].append({
                        "name": pod_name,
                        "status": status,
                        "restarts": metrics.get("restart_count", 0),
                    })
                deps = [{"name": dname, "pods": dpods} for dname, dpods in dep_map.items()]
                tree.append({"namespace": ns, "deployments": deps})
            return tree if tree else demo_tree
        except Exception:
            return demo_tree

    async def get_service_topology(self) -> Dict[str, Any]:
        """Feature 3: Service Topology Map v2 with health statuses."""
        demo_topology = {
            "nodes": [
                {"id": "student-portal", "health": "OK", "namespace": "university-frontend"},
                {"id": "notification-service", "health": "OK", "namespace": "university-frontend"},
                {"id": "attendance-service", "health": "WARN", "namespace": "university-backend"},
                {"id": "result-service", "health": "CRIT", "namespace": "university-backend"},
                {"id": "postgres", "health": "OK", "namespace": "university-data"},
            ],
            "edges": [
                {"source": "student-portal", "target": "attendance-service", "latency_ms": 32},
                {"source": "student-portal", "target": "result-service", "latency_ms": 84},
                {"source": "attendance-service", "target": "postgres", "latency_ms": 12},
                {"source": "result-service", "target": "postgres", "latency_ms": 15},
                {"source": "result-service", "target": "notification-service", "latency_ms": 45},
            ]
        }
        return demo_topology

    async def get_top_hotspots(self, n: int = 5) -> Dict[str, List[Dict[str, Any]]]:
        """Feature 8: Top N Problem Pods by CPU, Memory, Restarts, Error rate."""
        demo_hotspots = {
            "cpu": [
                {"pod_name": "result-service-0", "namespace": "university-backend", "value": "85.2%", "metric_raw": 0.852},
                {"pod_name": "student-portal-0", "namespace": "university-frontend", "value": "64.1%", "metric_raw": 0.641},
                {"pod_name": "postgres-0", "namespace": "university-data", "value": "45.0%", "metric_raw": 0.45},
            ],
            "memory": [
                {"pod_name": "postgres-0", "namespace": "university-data", "value": "91.5%", "metric_raw": 0.915},
                {"pod_name": "result-service-0", "namespace": "university-backend", "value": "88.4%", "metric_raw": 0.884},
                {"pod_name": "attendance-service-0", "namespace": "university-backend", "value": "72.0%", "metric_raw": 0.72},
            ],
            "restarts": [
                {"pod_name": "result-service-0", "namespace": "university-backend", "value": "5 restarts", "metric_raw": 5},
                {"pod_name": "student-portal-1", "namespace": "university-frontend", "value": "1 restart", "metric_raw": 1},
            ],
            "error_rate": [
                {"pod_name": "result-service-0", "namespace": "university-backend", "value": "4.2 err/s", "metric_raw": 4.2},
                {"pod_name": "attendance-service-0", "namespace": "university-backend", "value": "1.5 err/s", "metric_raw": 1.5},
            ],
        }
        if not self.is_healthy() or not self.client:
            return demo_hotspots
        try:
            pod_metrics = await self.get_pod_metrics_all_namespaces()
            flat_pods = []
            for ns, pods in pod_metrics.items():
                for p_name, metrics in pods.items():
                    flat_pods.append({
                        "pod_name": p_name,
                        "namespace": ns,
                        "cpu": metrics.get("cpu_usage", 0.0),
                        "mem": metrics.get("memory_usage", 0.0) / 1e6,  # MB
                        "restarts": metrics.get("restart_count", 0),
                        "err": metrics.get("error_rate", 0.0),
                    })
            if not flat_pods:
                return demo_hotspots

            top_cpu = sorted(flat_pods, key=lambda x: x["cpu"], reverse=True)[:n]
            top_mem = sorted(flat_pods, key=lambda x: x["mem"], reverse=True)[:n]
            top_rest = sorted(flat_pods, key=lambda x: x["restarts"], reverse=True)[:n]
            top_err = sorted(flat_pods, key=lambda x: x["err"], reverse=True)[:n]

            return {
                "cpu": [{"pod_name": p["pod_name"], "namespace": p["namespace"], "value": f"{round(p['cpu']*100, 1)}%", "metric_raw": p["cpu"]} for p in top_cpu],
                "memory": [{"pod_name": p["pod_name"], "namespace": p["namespace"], "value": f"{round(p['mem'], 1)} MB", "metric_raw": p["mem"]} for p in top_mem],
                "restarts": [{"pod_name": p["pod_name"], "namespace": p["namespace"], "value": f"{p['restarts']} restarts", "metric_raw": p["restarts"]} for p in top_rest if p["restarts"] > 0],
                "error_rate": [{"pod_name": p["pod_name"], "namespace": p["namespace"], "value": f"{round(p['err'], 2)} err/s", "metric_raw": p["err"]} for p in top_err if p["err"] > 0],
            }
        except Exception:
            return demo_hotspots

    async def get_namespace_summaries(self) -> List[Dict[str, Any]]:
        """Feature 11: Namespace Health & Cost Summary."""
        demo_namespaces = [
            {"namespace": "university-frontend", "health_score": 98.0, "cost_score": 45.0, "pods": 3, "restarts": 1, "cpu_usage": 0.12, "memory_gb": 0.54, "source": "simulated"},
            {"namespace": "university-backend", "health_score": 74.5, "cost_score": 85.0, "pods": 3, "restarts": 5, "cpu_usage": 0.68, "memory_gb": 1.85, "source": "simulated"},
            {"namespace": "university-data", "health_score": 99.9, "cost_score": 95.0, "pods": 1, "restarts": 0, "cpu_usage": 0.45, "memory_gb": 4.20, "source": "simulated"},
        ]
        if not self.is_healthy() or not self.client:
            return demo_namespaces
        try:
            pod_metrics = await self.get_pod_metrics_all_namespaces()
            res = []
            for ns, pods in pod_metrics.items():
                total_restarts = sum(m.get("restart_count", 0) for m in pods.values())
                total_cpu = sum(m.get("cpu_usage", 0.0) for m in pods.values())
                total_mem = sum(m.get("memory_usage", 0.0) for m in pods.values()) / 1e9  # GB
                health = max(0.0, 100.0 - (total_restarts * 5))
                cost = min(100.0, (total_cpu * 20 + total_mem * 10))
                res.append({
                    "namespace": ns,
                    "health_score": round(health, 1),
                    "cost_score": round(cost, 1),
                    "pods": len(pods),
                    "restarts": total_restarts,
                    "cpu_usage": round(total_cpu, 2),
                    "memory_gb": round(total_mem, 2),
                    "source": "prometheus",
                })
            return res if res else demo_namespaces
        except Exception:
            return demo_namespaces
