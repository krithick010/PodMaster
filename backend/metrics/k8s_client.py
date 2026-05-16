"""
Kubernetes client wrapper for KubeVision AI.
Provides high-level operations for pod discovery, log access, and event tracking.
Handles both in-cluster and local development environments.
"""

import asyncio
import os
from typing import Any, Dict, List, Optional

from kubernetes import client, config, watch
from kubernetes.client.rest import ApiException


class KubernetesClient:
    """
    Wrapper around Kubernetes Python client.
    Detects environment (in-cluster vs local) and provides async-friendly operations.
    """

    def __init__(self):
        """Initialize Kubernetes client."""
        self.v1: Optional[client.CoreV1Api] = None
        self.apps_v1: Optional[client.AppsV1Api] = None
        self._initialize()

    def _initialize(self) -> None:
        """Load Kubernetes config from environment."""
        try:
            # Try in-cluster configuration first
            config.load_incluster_config()
            print("Using in-cluster Kubernetes configuration")
        except config.config_exception.ConfigException:
            try:
                # Fall back to local kubeconfig
                config.load_kube_config()
                print("Using local kubeconfig")
            except Exception as e:
                print(f"Warning: Could not load Kubernetes config: {e}")
                print("K8s operations will not work without valid config")

        self.v1 = client.CoreV1Api()
        self.apps_v1 = client.AppsV1Api()

    async def get_all_namespaces(self) -> List[str]:
        """
        List all namespaces in the cluster.

        Returns:
            List of namespace names
        """
        try:
            namespaces = await asyncio.to_thread(self.v1.list_namespace)
            return sorted([ns.metadata.name for ns in namespaces.items if ns.metadata.name])
        except ApiException as e:
            print(f"Error listing namespaces: {e}")
            # Return demo namespaces as fallback
            return ["university-frontend", "university-backend", "university-data"]

    async def get_pods_all_namespaces(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        List all pods across all namespaces.

        Returns:
            Dict keyed by namespace containing pod information
        """
        try:
            pods_by_namespace: Dict[str, List[Dict[str, Any]]] = {}
            namespaces = await self.get_all_namespaces()

            for namespace in namespaces:
                try:
                    pods = await asyncio.to_thread(
                        self.v1.list_namespaced_pod,
                        namespace=namespace,
                    )
                    pod_list = []
                    for pod in pods.items:
                        pod_info = {
                            "name": pod.metadata.name,
                            "namespace": pod.metadata.namespace,
                            "status": pod.status.phase,
                            "ready": self._get_pod_ready_status(pod),
                            "restart_count": self._get_pod_restart_count(pod),
                            "containers": [c.name for c in pod.spec.containers],
                            "labels": dict(pod.metadata.labels or {}),
                            "creation_timestamp": pod.metadata.creation_timestamp,
                        }
                        pod_list.append(pod_info)

                    pods_by_namespace[namespace] = pod_list
                except ApiException as e:
                    print(f"Error listing pods in namespace {namespace}: {e}")
                    pods_by_namespace[namespace] = []

            return pods_by_namespace
        except Exception as e:
            print(f"Error listing pods: {e}")
            return {}

    async def get_pods_in_namespace(self, namespace: str) -> List[Dict[str, Any]]:
        """
        List pods in a specific namespace.

        Args:
            namespace: Kubernetes namespace

        Returns:
            List of pod information dicts
        """
        try:
            pods = await asyncio.to_thread(
                self.v1.list_namespaced_pod,
                namespace=namespace,
            )
            pod_list = []
            for pod in pods.items:
                pod_info = {
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "status": pod.status.phase,
                    "ready": self._get_pod_ready_status(pod),
                    "restart_count": self._get_pod_restart_count(pod),
                    "containers": [c.name for c in pod.spec.containers],
                    "labels": dict(pod.metadata.labels or {}),
                    "creation_timestamp": pod.metadata.creation_timestamp,
                }
                pod_list.append(pod_info)

            return pod_list
        except ApiException as e:
            print(f"Error listing pods in namespace {namespace}: {e}")
            return []

    async def get_pod_logs(
        self,
        pod_name: str,
        namespace: str,
        container: Optional[str] = None,
        tail_lines: int = 100,
    ) -> str:
        """
        Get logs from a pod.

        Args:
            pod_name: Pod name
            namespace: Pod namespace
            container: Container name (optional, uses first container if not specified)
            tail_lines: Number of recent log lines to retrieve

        Returns:
            Log text (empty string if logs cannot be accessed)
        """
        try:
            logs = await asyncio.to_thread(
                self.v1.read_namespaced_pod_log,
                name=pod_name,
                namespace=namespace,
                container=container,
                tail_lines=tail_lines,
            )
            return logs if logs else ""
        except ApiException as e:
            # Log access may be restricted by RBAC
            print(f"Warning: Could not read pod logs for {namespace}/{pod_name}: {e}")
            return ""
        except Exception as e:
            print(f"Error reading pod logs: {e}")
            return ""

    async def get_pod_events(
        self,
        pod_name: str,
        namespace: str,
    ) -> List[Dict[str, Any]]:
        """
        Get events for a pod.

        Args:
            pod_name: Pod name
            namespace: Pod namespace

        Returns:
            List of event dicts
        """
        try:
            events = await asyncio.to_thread(
                self.v1.list_namespaced_event,
                namespace=namespace,
                field_selector=f"involvedObject.name={pod_name}",
            )
            event_list = []
            for event in events.items:
                event_info = {
                    "type": event.type,
                    "reason": event.reason,
                    "message": event.message,
                    "count": event.count,
                    "first_timestamp": event.first_timestamp,
                    "last_timestamp": event.last_timestamp,
                }
                event_list.append(event_info)

            return event_list
        except ApiException as e:
            print(f"Warning: Could not read events for {namespace}/{pod_name}: {e}")
            return []

    async def get_pending_pods(self) -> List[Dict[str, Any]]:
        """
        Get all pods in Pending state across the cluster.

        Returns:
            List of pending pod dicts
        """
        try:
            namespaces = await self.get_all_namespaces()
            pending_pods = []

            for namespace in namespaces:
                try:
                    pods = await asyncio.to_thread(
                        self.v1.list_namespaced_pod,
                        namespace=namespace,
                        field_selector="status.phase=Pending",
                    )
                    for pod in pods.items:
                        pending_pods.append({
                            "name": pod.metadata.name,
                            "namespace": pod.metadata.namespace,
                            "creation_timestamp": pod.metadata.creation_timestamp,
                            "reason": self._get_pod_pending_reason(pod),
                        })
                except ApiException as e:
                    print(f"Error checking pending pods in {namespace}: {e}")

            return pending_pods
        except Exception as e:
            print(f"Error getting pending pods: {e}")
            return []

    async def get_pvcs(self, namespace: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get PersistentVolumeClaims.

        Args:
            namespace: Specific namespace to query (optional, queries all if not specified)

        Returns:
            Dict keyed by namespace containing PVC information
        """
        try:
            pvcs_by_namespace: Dict[str, List[Dict[str, Any]]] = {}

            if namespace:
                namespaces = [namespace]
            else:
                namespaces = await self.get_all_namespaces()

            for ns in namespaces:
                try:
                    pvcs = await asyncio.to_thread(
                        self.v1.list_namespaced_persistent_volume_claim,
                        namespace=ns,
                    )
                    pvc_list = []
                    for pvc in pvcs.items:
                        pvc_info = {
                            "name": pvc.metadata.name,
                            "namespace": pvc.metadata.namespace,
                            "status": pvc.status.phase,
                            "storage_class": pvc.spec.storage_class_name,
                            "size": pvc.spec.resources.requests.get("storage", "unknown")
                            if pvc.spec.resources and pvc.spec.resources.requests
                            else "unknown",
                            "access_modes": pvc.spec.access_modes or [],
                        }
                        pvc_list.append(pvc_info)

                    pvcs_by_namespace[ns] = pvc_list
                except ApiException as e:
                    print(f"Error listing PVCs in namespace {ns}: {e}")
                    pvcs_by_namespace[ns] = []

            return pvcs_by_namespace
        except Exception as e:
            print(f"Error getting PVCs: {e}")
            return {}

    async def get_node_conditions(self) -> List[Dict[str, Any]]:
        """
        Get current conditions of all nodes.

        Returns:
            List of node condition dicts
        """
        try:
            nodes = await asyncio.to_thread(self.v1.list_node)
            node_list = []

            for node in nodes.items:
                conditions = []
                for condition in node.status.conditions or []:
                    conditions.append({
                        "type": condition.type,
                        "status": condition.status,
                        "reason": condition.reason,
                        "message": condition.message,
                    })

                node_info = {
                    "name": node.metadata.name,
                    "conditions": conditions,
                    "taints": [
                        {
                            "key": taint.key,
                            "value": taint.value,
                            "effect": taint.effect,
                        }
                        for taint in (node.spec.taints or [])
                    ],
                }
                node_list.append(node_info)

            return node_list
        except ApiException as e:
            print(f"Error listing nodes: {e}")
            return []

    @staticmethod
    def _get_pod_ready_status(pod: client.V1Pod) -> int:
        """Get number of ready containers in pod."""
        if not pod.status or not pod.status.conditions:
            return 0

        for condition in pod.status.conditions:
            if condition.type == "Ready":
                return 1 if condition.status == "True" else 0

        return 0

    @staticmethod
    def _get_pod_restart_count(pod: client.V1Pod) -> int:
        """Get total restart count for pod."""
        if not pod.status or not pod.status.container_statuses:
            return 0

        return sum(
            cs.restart_count or 0
            for cs in pod.status.container_statuses
        )

    @staticmethod
    def _get_pod_pending_reason(pod: client.V1Pod) -> str:
        """Get reason why pod is pending."""
        if not pod.status or not pod.status.conditions:
            return "Unknown"

        for condition in pod.status.conditions:
            if condition.type == "PodScheduled" and condition.status == "False":
                return condition.reason or "Unknown"

        return "Unknown"

    async def get_log_error_rates(self) -> Dict[str, Dict[str, Any]]:
        """
        Get log error rates for all pods across all namespaces.
        
        Counts ERROR, FATAL, Exception, OOMKilled, CrashLoopBackOff patterns
        in the last 50 log lines per pod.
        
        Returns:
            Dict keyed by namespace containing pod log metrics:
            {
                "namespace": {
                    "pod_name": {
                        "error_rate": float (errors per minute estimate),
                        "error_count": int,
                        "warn_count": int,
                        "crash_indicators": [str]  # e.g., ["OOMKilled", "CrashLoopBackOff"]
                    }
                }
            }
        """
        try:
            namespaces = await self.get_all_namespaces()
            result: Dict[str, Dict[str, Any]] = {}
            
            for namespace in namespaces:
                try:
                    pods = await asyncio.to_thread(
                        self.v1.list_namespaced_pod,
                        namespace=namespace,
                    )
                    
                    for pod in pods.items:
                        pod_name = pod.metadata.name
                        status = pod.status.phase
                        
                        # Only check running pods
                        if status != "Running":
                            continue
                        
                        # Get recent logs
                        logs = await asyncio.to_thread(
                            self.v1.read_namespaced_pod_log,
                            name=pod_name,
                            namespace=namespace,
                            tail_lines=50,
                            timestamps=True,
                        )
                        
                        if not logs:
                            continue
                        
                        # Parse logs and count errors
                        error_count = 0
                        warn_count = 0
                        crash_indicators = []
                        
                        for line in logs.split("\n"):
                            line_lower = line.lower()
                            
                            # Count ERROR/FATAL
                            if "error" in line_lower or "fatal" in line_lower:
                                error_count += 1
                            
                            # Count WARN
                            if "warn" in line_lower:
                                warn_count += 1
                            
                            # Detect crash indicators
                            if "oomkilled" in line_lower:
                                if "OOMKilled" not in crash_indicators:
                                    crash_indicators.append("OOMKilled")
                            if "crashloopbackoff" in line_lower:
                                if "CrashLoopBackOff" not in crash_indicators:
                                    crash_indicators.append("CrashLoopBackOff")
                            if "sigkill" in line_lower:
                                if "SIGKILL" not in crash_indicators:
                                    crash_indicators.append("SIGKILL")
                            if "exception" in line_lower:
                                if "Exception" not in crash_indicators:
                                    crash_indicators.append("Exception")
                        
                        # Estimate error rate (errors per minute)
                        # Based on 50 lines over ~1 minute window
                        error_rate = error_count / 1.0  # simple estimate
                        
                        if namespace not in result:
                            result[namespace] = {}
                        
                        result[namespace][pod_name] = {
                            "error_rate": error_rate,
                            "error_count": error_count,
                            "warn_count": warn_count,
                            "crash_indicators": crash_indicators,
                        }
                        
                except ApiException as e:
                    print(f"Error getting logs for namespace {namespace}: {e}")
                    continue
                    
            return result
            
        except Exception as e:
            print(f"Error in get_log_error_rates: {e}")
            return {}
