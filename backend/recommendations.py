"""
Recommendations engine for KubeVision AI.
Generates actionable remediation suggestions based on anomalies.
"""

from typing import Any, Dict, List


class RecommendationEngine:
    """
    Generates actionable recommendations based on detected anomalies.
    """

    @staticmethod
    def generate_recommendations(anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Generate recommendations for detected anomalies.

        Args:
            anomalies: List of anomalies

        Returns:
            List of recommendation dicts with action, priority, and explanation
        """
        recommendations: List[Dict[str, Any]] = []
        recommendations_set = set()  # Avoid duplicates

        for anomaly in anomalies:
            anomaly_type = anomaly.get("anomaly_type", "")
            pod_name = anomaly.get("pod_name", "")
            namespace = anomaly.get("namespace", "")

            # Generate recommendations based on anomaly type
            if anomaly_type == "CPU_CRITICAL":
                recommendation_key = f"scale_cpu_{pod_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "critical",
                        "action": f"Increase CPU limit for {pod_name}",
                        "command": f"kubectl set resources pod {pod_name} -n {namespace} --limits=cpu=500m",
                        "explanation": "Pod is consuming 95%+ of CPU limit. Increase the limit or optimize the application.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type == "CPU_HIGH":
                recommendation_key = f"monitor_cpu_{pod_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "warning",
                        "action": f"Monitor CPU usage of {pod_name}",
                        "command": f"kubectl top pod {pod_name} -n {namespace} --containers",
                        "explanation": "CPU usage is elevated (80%+). Monitor over the next hour and scale if needed.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type == "MEMORY_CRITICAL":
                recommendation_key = f"increase_memory_{pod_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "critical",
                        "action": f"Increase memory limit for {pod_name}",
                        "command": f"kubectl set resources pod {pod_name} -n {namespace} --limits=memory=512Mi",
                        "explanation": "Pod is at 95%+ memory. Increase limit or investigate memory leak.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type in ["MEMORY_HIGH", "LOG_ERROR_ELEVATED"]:
                recommendation_key = f"investigate_{pod_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "warning",
                        "action": f"Investigate {pod_name} logs",
                        "command": f"kubectl logs {pod_name} -n {namespace} --tail=50",
                        "explanation": "Check application logs for errors or memory leaks.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type == "STORAGE_CRITICAL":
                pvc_name = anomaly.get("metrics", {}).get("pvc_name", "unknown")
                recommendation_key = f"expand_pvc_{pvc_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "critical",
                        "action": f"Expand PVC {pvc_name}",
                        "command": f"kubectl patch pvc {pvc_name} -n {namespace} -p '{{\"spec\":{{\"resources\":{{\"requests\":{{\"storage\":\"2Gi\"}}}}}}}}'",
                        "explanation": "PVC is 90%+ full. Expand immediately to prevent data loss.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type == "STORAGE_PRESSURE":
                recommendation_key = f"cleanup_pvc_{pod_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "warning",
                        "action": f"Clean up old data in {pod_name}",
                        "command": f"kubectl exec {pod_name} -n {namespace} -- rm -rf /data/old_*",
                        "explanation": "PVC is 80%+ full. Delete old data or increase capacity soon.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type == "POD_PENDING_TIMEOUT":
                recommendation_key = f"check_resources_{namespace}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "critical",
                        "action": f"Check cluster resources",
                        "command": f"kubectl describe nodes",
                        "explanation": f"Pod {pod_name} is stuck pending for >2min. Cluster may be out of resources.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type == "LOG_ERROR_SPIKE":
                recommendation_key = f"restart_pod_{pod_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "warning",
                        "action": f"Review error logs and consider restarting {pod_name}",
                        "command": f"kubectl logs {pod_name} -n {namespace} | grep ERROR | tail -20",
                        "explanation": "Error rate is spiking. Check logs for root cause, then consider restart.",
                    })
                    recommendations_set.add(recommendation_key)

            elif anomaly_type == "NETWORK_CRITICAL_IN":
                recommendation_key = f"check_network_{pod_name}"
                if recommendation_key not in recommendations_set:
                    recommendations.append({
                        "id": recommendation_key,
                        "priority": "warning",
                        "action": f"Investigate inbound network surge for {pod_name}",
                        "command": f"kubectl exec {pod_name} -n {namespace} -- netstat -an | grep ESTABLISHED | wc -l",
                        "explanation": "Pod is receiving massive inbound traffic. Verify this is expected.",
                    })
                    recommendations_set.add(recommendation_key)

        return list(recommendations)

    @staticmethod
    def prioritize_recommendations(
        recommendations: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Sort recommendations by priority.

        Args:
            recommendations: List of recommendations

        Returns:
            Sorted list (critical first, then warning, then info)
        """
        priority_order = {"critical": 0, "warning": 1, "info": 2}
        return sorted(
            recommendations,
            key=lambda r: priority_order.get(r.get("priority", "info"), 99),
        )
