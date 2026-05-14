"""
LLM Insight Generator for PodMaster.
Generates AI explanations for detected anomalies using OpenRouter (primary) or Ollama (fallback).
"""

import os
import json
import httpx
from typing import Optional, Dict, Any, List
from agents.base_agent import Anomaly
from llm.prompt_templates import ANOMALY_TEMPLATES, FALLBACK_TEMPLATES

class InsightGenerator:
    """
    Generates LLM insights for anomalies using OpenRouter or Ollama.
    """

    def __init__(self):
        """Initialize with configuration from environment."""
        self.openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self.openrouter_model = os.getenv("OPENROUTER_MODEL", "openrouter/free")
        self.ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "phi3.5:latest")
        
        self.use_openrouter = bool(self.openrouter_api_key)
        
        if self.use_openrouter:
            print(f"✓ AI Insights: OpenRouter enabled using {self.openrouter_model}")
        else:
            print("⚠ AI Insights: OpenRouter API key missing, will attempt Ollama or Fallback.")

    async def generate_insight(self, anomaly: Anomaly) -> str:
        """Generate an insight using the best available source."""
        if self.use_openrouter:
            try:
                return await self._generate_with_openrouter(anomaly)
            except Exception as e:
                print(f"OpenRouter Error: {e}")
                # Fall through to next option
        
        # Fallback to templates/Ollama
        return self._get_fallback_insight(anomaly)

    async def _generate_with_openrouter(self, anomaly: Anomaly) -> str:
        """Call OpenRouter API."""
        prompt = self._build_prompt(anomaly)
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.openrouter_api_key}",
                    "HTTP-Referer": "https://podmaster.ai",
                    "X-Title": "PodMaster AI",
                },
                json={
                    "model": self.openrouter_model,
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are PodMaster AI, a Kubernetes expert. Provide concise, 1-2 sentence technical insights for cluster anomalies. Be precise and operational."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 150,
                    "temperature": 0.5
                },
                timeout=15.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'choices' not in data or not data['choices']:
                    print(f"OpenRouter empty choices: {data}")
                    return self._get_fallback_insight(anomaly)
                    
                content = data['choices'][0]['message'].get('content')
                if content:
                    return content.strip()
                return self._get_fallback_insight(anomaly)
            else:
                print(f"OpenRouter API Error {response.status_code}: {response.text}")
                raise Exception("API failure")

    async def generate_correlation_insight(self, correlations: List[Dict[str, Any]]) -> List[str]:
        """Explain service correlations using AI."""
        if not self.use_openrouter or not correlations:
            return ["Collecting more temporal data for analysis.", "Temporal patterns developing."]

        try:
            corr_summary = [
                f"- {c['pod1']} <-> {c['pod2']} ({c['correlation']*100:.1f}% match)"
                for c in correlations[:5]
            ]
            
            prompt = f"Analyze these Kubernetes service correlations and provide 3 short bullet points of Relationship Intelligence. Correlations: {json.dumps(corr_summary)}"

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.openrouter_api_key}"},
                    json={
                        "model": self.openrouter_model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": 200,
                        "temperature": 0.4
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'choices' not in data or not data['choices']:
                        return ["Analyzing relationship patterns...", "Temporal data maturing."]
                        
                    content = data['choices'][0]['message'].get('content')
                    if content:
                        lines = [line.strip().lstrip('-•*').strip() for line in content.strip().split('\n') if line.strip()]
                        return lines[:3]
                    return ["Analyzing relationship patterns...", "Temporal data maturing."]
        except Exception as e:
            print(f"Correlation Insight Error: {e}")
            
        return ["Collecting baseline metrics for relationship analysis...", "Temporal patterns developing."]

    async def ask_podmaster(self, query: str, context: Dict[str, Any]) -> str:
        """Process a natural language query about the cluster."""
        if not self.use_openrouter:
            return "Local intelligence mode: Please check the dashboard for real-time telemetry."

        try:
            active_anomalies = context.get("anomalies", [])
            anomaly_text = "\n".join([f"- {a.get('pod_name')}: {a.get('description')}" for a in active_anomalies[:5]])
            
            prompt = f"""User Question: "{query}"\nCurrent Cluster State:\n{anomaly_text if active_anomalies else "- No critical anomalies detected."}"""

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.openrouter_api_key}"},
                    json={
                        "model": self.openrouter_model,
                        "messages": [
                            {"role": "system", "content": "You are PodMaster AI, a helpful SRE assistant. Answer questions about the cluster based on telemetry."},
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": 150,
                        "temperature": 0.5
                    },
                    timeout=15.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if 'choices' not in data or not data['choices']:
                        return "Telemetry analysis in progress. Please check the dashboard metrics for current status."
                        
                    content = data['choices'][0]['message'].get('content')
                    if content:
                        return content.strip()
        except Exception as e:
            print(f"Global Query Error: {e}")
            
        return "I'm currently analyzing the cluster state. Telemetry appears stable."

    def _build_prompt(self, anomaly: Anomaly) -> str:
        """Build prompt for LLM."""
        template = ANOMALY_TEMPLATES.get(anomaly.anomaly_type, ANOMALY_TEMPLATES.get("GENERIC", ""))
        return template.format(
            pod_name=anomaly.pod_name,
            namespace=anomaly.namespace,
            anomaly_type=anomaly.anomaly_type,
            description=anomaly.description,
            metrics_json=json.dumps(anomaly.metrics)
        )

    def _get_fallback_insight(self, anomaly: Anomaly) -> str:
        """Template-based fallback."""
        template = FALLBACK_TEMPLATES.get(anomaly.anomaly_type, FALLBACK_TEMPLATES.get("GENERIC", ""))
        return template.format(
            pod_name=anomaly.pod_name,
            namespace=anomaly.namespace,
            anomaly_type=anomaly.anomaly_type,
            description=anomaly.description
        )
