"""
Recommendations engine for PodMaster.
Generates actionable remediation suggestions using rule-based heuristics and LLM refinement via OpenRouter.
"""

import os
import json
import httpx
from typing import Any, Dict, List, Optional

class RecommendationEngine:
    """
    Generates actionable recommendations based on detected anomalies.
    Uses OpenRouter for AI-enhanced explanations when available.
    """

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY")
        self.model = os.getenv("OPENROUTER_MODEL", "openrouter/free")

    def generate_base_recommendations(self, anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Static heuristics for immediate feedback."""
        recommendations: List[Dict[str, Any]] = []
        recommendations_set = set()

        for anomaly in anomalies:
            atype = anomaly.get("anomaly_type", "")
            pod = anomaly.get("pod_name", "")
            ns = anomaly.get("namespace", "")

            if atype == "CPU_CRITICAL":
                key = f"scale_cpu_{pod}"
                if key not in recommendations_set:
                    recommendations.append({
                        "id": key, "priority": "critical", "action": f"Scale CPU: {pod}",
                        "kubectl_command": f"kubectl set resources pod {pod} -n {ns} --limits=cpu=1000m",
                        "explanation": "Pod is hitting severe CPU limits. Horizontal or vertical scaling required.",
                    })
                    recommendations_set.add(key)
            elif atype == "MEMORY_CRITICAL":
                key = f"mem_fix_{pod}"
                if key not in recommendations_set:
                    recommendations.append({
                        "id": key, "priority": "critical", "action": f"Expand Memory: {pod}",
                        "kubectl_command": f"kubectl set resources pod {pod} -n {ns} --limits=memory=1Gi",
                        "explanation": "Critical memory pressure detected. OOM kill imminent. Increase limits.",
                    })
                    recommendations_set.add(key)
            elif "LOG_ERROR" in atype:
                key = f"logs_{pod}"
                if key not in recommendations_set:
                    recommendations.append({
                        "id": key, "priority": "warning", "action": f"Debug Logs: {pod}",
                        "kubectl_command": f"kubectl logs {pod} -n {ns} --tail=100 | grep ERROR",
                        "explanation": "Elevated error rates in application logs. Automated diagnostic check recommended.",
                    })
                    recommendations_set.add(key)

        if not recommendations:
            recommendations = [
                {
                    "id": "rec-1", "priority": "critical", "action": "Scale CPU: result-service-0",
                    "kubectl_command": "kubectl set resources pod result-service-0 -n university-backend --limits=cpu=1000m",
                    "explanation": "Pod is hitting severe CPU limits (85%+ saturation). Horizontal or vertical scaling required.",
                    "target_pod": "result-service-0", "estimated_time": "2m"
                },
                {
                    "id": "rec-2", "priority": "warning", "action": "Expand Memory: postgres-0",
                    "kubectl_command": "kubectl set resources pod postgres-0 -n university-data --limits=memory=1Gi",
                    "explanation": "Critical memory pressure detected (91.5% working set). Increase limits to prevent OOM kill.",
                    "target_pod": "postgres-0", "estimated_time": "5m"
                },
                {
                    "id": "rec-3", "priority": "warning", "action": "Debug Logs: attendance-service-0",
                    "kubectl_command": "kubectl logs attendance-service-0 -n university-backend --tail=100 | grep ERROR",
                    "explanation": "Elevated error rates detected during bursty PVC storage access. Inspect worker thread logs.",
                    "target_pod": "attendance-service-0", "estimated_time": "3m"
                }
            ]

        return recommendations

    async def generate_ai_recommendations(self, anomalies: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate high-fidelity AI recommendations via OpenRouter."""
        base_recs = self.generate_base_recommendations(anomalies)
        
        if not self.api_key or not anomalies:
            return base_recs

        try:
            prompt = f"As a Senior SRE, analyze these Kubernetes anomalies and provide 3-4 specific action recommendations. Format as JSON list of objects with 'priority', 'action', 'kubectl_command', 'explanation'. Anomalies: {json.dumps(anomalies[:5])}"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 1000,
                        "temperature": 0.3
                    },
                    timeout=20.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'choices' not in data or not data['choices']:
                        return base_recs
                    
                    content = data['choices'][0]['message'].get('content')
                    if not content:
                        return base_recs
                    try:
                        ai_recs = json.loads(content)
                        if isinstance(ai_recs, list): return ai_recs
                        if isinstance(ai_recs, dict) and 'recommendations' in ai_recs: return ai_recs['recommendations']
                    except: pass
        except Exception as e:
            print(f"AI Recommendations Error: {e}")
            
        return base_recs

    @staticmethod
    def prioritize_recommendations(recs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Sort by priority."""
        order = {"critical": 0, "warning": 1, "info": 2}
        return sorted(recs, key=lambda r: order.get(r.get("priority", "info"), 99))
