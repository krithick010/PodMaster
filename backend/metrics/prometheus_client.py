"""
Prometheus client for KubeVision AI.
Provides multi-namespace metric queries with fallback to mock data.
"""

import os
from typing import Any, Dict, List, Optional

import httpx
from prometheus_api_client import PrometheusConnect


class PrometheusClient:
    """
    Client for querying Prometheus metrics.
    Supports multi-namespace queries and graceful fallback to mock data.
    """

    def __init__(self, prometheus_url: str = "http://localhost:9090"):
        """
        Initialize Prometheus client.

        Args:
            prometheus_url: URL of Prometheus server
        """
        self.prometheus_url = prometheus_url
        self.client: Optional[PrometheusConnect] = None
        self._initialize()

    def _initialize(self) -> None:
        """Initialize Prometheus connection."""
        try:
            self.client = PrometheusConnect(url=self.prometheus_url, disable_ssl=True)
            # Test connection
            self.client.custom_query("up")
        except Exception as e:
            print(f"Warning: Could not connect to Prometheus at {self.prometheus_url}: {e}")
            print("Falling back to mock data mode.")
            self.client = None

    async def get_all_namespaces(self) -> List[str]:
        """
        Discover all namespaces in the cluster.

        Returns:
            List of namespace names
        """
        if not self.client:
            self._initialize()
            if not self.client:
                return self._get_mock_namespaces()

        try:
            # Query Prometheus for unique namespaces from kube_pod_info
            result = self.client.custom_query('label_values(kube_pod_info, namespace)')
            if isinstance(result, list):
                return sorted(result)
            return []
        except Exception as e:
            print(f"Error querying namespaces: {e}")
            return self._get_mock_namespaces()

    async def get_pod_metrics_all_namespaces(self) -> Dict[str, Dict[str, Any]]:
        """
        Get current metrics for all pods across all namespaces.

        Returns:
            Dict keyed by namespace, containing pod metrics
            Structure: {
                "namespace": {
                    "pod-name": {
                        "cpu_usage": float,
                        "cpu_limit": float,
                        "memory_usage": float,
                        "memory_limit": float,
                        "restart_count": int,
                        "network_in": float,
                        "network_out": float
                    }
                }
            }
        """
        if not self.client:
            self._initialize()
            if not self.client:
                return self._get_mock_pod_metrics()

        try:
            result: Dict[str, Dict[str, Any]] = {}

            # Query all pods
            pods_query = 'kube_pod_info'
            pods = self.client.custom_query(pods_query)

            for pod_metric in pods:
                namespace = pod_metric.get('metric', {}).get('namespace')
                pod_name = pod_metric.get('metric', {}).get('pod')

                if not namespace or not pod_name:
                    continue

                if namespace not in result:
                    result[namespace] = {}

                # Query CPU usage (sum across all containers in pod)
                cpu_query = f'sum(rate(container_cpu_usage_seconds_total{{pod="{pod_name}", namespace="{namespace}"}}[1m]))'
                cpu_result = self.client.custom_query(cpu_query)
                cpu_usage = float(cpu_result[0]['value'][1]) if cpu_result else 0.0

                # Query CPU limit (sum across all containers)
                cpu_limit_query = f'sum(kube_pod_container_resource_limits{{pod="{pod_name}", namespace="{namespace}", resource="cpu"}})'
                cpu_limit_result = self.client.custom_query(cpu_limit_query)
                cpu_limit = float(cpu_limit_result[0]['value'][1]) if cpu_limit_result else 0.0  # 0 means no limit

                # Query memory usage (sum across all containers)
                memory_query = f'sum(container_memory_working_set_bytes{{pod="{pod_name}", namespace="{namespace}"}})'
                memory_result = self.client.custom_query(memory_query)
                memory_usage = float(memory_result[0]['value'][1]) if memory_result else 0.0

                # Query memory limit (sum across all containers)
                memory_limit_query = f'sum(kube_pod_container_resource_limits{{pod="{pod_name}", namespace="{namespace}", resource="memory"}})'
                memory_limit_result = self.client.custom_query(memory_limit_query)
                memory_limit = float(memory_limit_result[0]['value'][1]) if memory_limit_result else 0.0  # 0 means no limit

                # Query restart count
                restart_query = f'kube_pod_container_status_restarts_total{{pod="{pod_name}", namespace="{namespace}"}}'
                restart_result = self.client.custom_query(restart_query)
                restart_count = int(float(restart_result[0]['value'][1])) if restart_result else 0

                # Query network in
                network_in_query = f'rate(container_network_receive_bytes_total{{pod="{pod_name}", namespace="{namespace}"}}[5m])'
                network_in_result = self.client.custom_query(network_in_query)
                network_in = float(network_in_result[0]['value'][1]) if network_in_result else 0.0

                # Query network out
                network_out_query = f'rate(container_network_transmit_bytes_total{{pod="{pod_name}", namespace="{namespace}"}}[5m])'
                network_out_result = self.client.custom_query(network_out_query)
                network_out = float(network_out_result[0]['value'][1]) if network_out_result else 0.0

                result[namespace][pod_name] = {
                    'cpu_usage': cpu_usage,
                    'cpu_limit': cpu_limit,
                    'memory_usage': memory_usage,
                    'memory_limit': memory_limit,
                    'restart_count': restart_count,
                    'network_in': network_in,
                    'network_out': network_out,
                }

            return result
        except Exception as e:
            print(f"Error querying pod metrics: {e}")
            return self._get_mock_pod_metrics()

    async def get_pvc_metrics(self, namespace: str = ".*") -> Dict[str, Dict[str, Any]]:
        """
        Get PVC capacity and usage metrics.

        Args:
            namespace: Namespace regex pattern (default ".*" for all)

        Returns:
            Dict keyed by PVC name with capacity and usage metrics
        """
        if not self.client:
            self._initialize()
            if not self.client:
                return self._get_mock_pvc_metrics()

        try:
            result: Dict[str, Dict[str, Any]] = {}

            # Query PVC capacity
            capacity_query = f'kubelet_volume_stats_capacity_bytes{{namespace=~"{namespace}"}}'
            capacity_results = self.client.custom_query(capacity_query)

            for metric in capacity_results:
                pvc_name = metric.get('metric', {}).get('persistentvolumeclaim')
                namespace_val = metric.get('metric', {}).get('namespace')
                pod_name = metric.get('metric', {}).get('pod')

                if not pvc_name:
                    continue

                key = f"{namespace_val}/{pvc_name}"
                if key not in result:
                    result[key] = {
                        'pvc_name': pvc_name,
                        'namespace': namespace_val,
                        'pod_name': pod_name,
                    }

                result[key]['capacity_bytes'] = float(metric['value'][1])

            # Query PVC usage
            usage_query = f'kubelet_volume_stats_used_bytes{{namespace=~"{namespace}"}}'
            usage_results = self.client.custom_query(usage_query)

            for metric in usage_results:
                pvc_name = metric.get('metric', {}).get('persistentvolumeclaim')
                namespace_val = metric.get('metric', {}).get('namespace')

                if not pvc_name:
                    continue

                key = f"{namespace_val}/{pvc_name}"
                if key not in result:
                    result[key] = {
                        'pvc_name': pvc_name,
                        'namespace': namespace_val,
                    }

                used_bytes = float(metric['value'][1])
                result[key]['used_bytes'] = used_bytes

                # Calculate percentage
                if 'capacity_bytes' in result[key]:
                    capacity = result[key]['capacity_bytes']
                    result[key]['usage_percentage'] = (used_bytes / capacity * 100) if capacity > 0 else 0

            return result
        except Exception as e:
            print(f"Error querying PVC metrics: {e}")
            return self._get_mock_pvc_metrics()

    async def query(self, query: str) -> List[Dict[str, Any]]:
        """
        Execute a raw Prometheus query.

        Args:
            query: PromQL query string

        Returns:
            List of query results
        """
        if not self.client:
            self._initialize()
            if not self.client:
                return []

        try:
            result = self.client.custom_query(query)
            return result if isinstance(result, list) else [result]
        except Exception as e:
            print(f"Error executing query: {e}")
            return []

    def _get_mock_namespaces(self) -> List[str]:
        """Return mock namespace list for demo mode."""
        return ["university-frontend", "university-backend", "university-data"]

    def _get_mock_pod_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Return mock pod metrics for demo mode."""
        return {
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
                "notification-service-0": {
                    "cpu_usage": 0.02,
                    "cpu_limit": 0.2,
                    "memory_usage": 48e6,
                    "memory_limit": 256e6,
                    "restart_count": 0,
                    "network_in": 512,
                    "network_out": 1024,
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
                "result-service-0": {
                    "cpu_usage": 0.08,
                    "cpu_limit": 0.5,
                    "memory_usage": 128e6,
                    "memory_limit": 512e6,
                    "restart_count": 0,
                    "network_in": 256,
                    "network_out": 512,
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

    def _get_mock_pvc_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Return mock PVC metrics for demo mode."""
        return {
            "university-backend/attendance-storage": {
                "pvc_name": "attendance-storage",
                "namespace": "university-backend",
                "pod_name": "attendance-service-0",
                "capacity_bytes": 1e9,
                "used_bytes": 2e8,
                "usage_percentage": 20,
            },
        }
