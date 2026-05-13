"""
LLM Insight Generator for KubeVision AI.
Generates AI explanations for detected anomalies using Ollama.
Includes fallback templates when Ollama is unavailable.
"""

import os
from typing import Optional

import httpx

from agents.base_agent import Anomaly
from llm.prompt_templates import ANOMALY_TEMPLATES, FALLBACK_TEMPLATES


class InsightGenerator:
    """
    Generates LLM insights for anomalies using Ollama.
    Falls back to template-based insights if Ollama is unavailable.
    """

    def __init__(self, ollama_url: str = "http://localhost:11434", model: str = "phi3.5:latest"):
        """
        Initialize insight generator.

        Args:
            ollama_url: URL of Ollama server
            model: Model name to use (must be downloaded in Ollama first)
        """
        self.ollama_url = ollama_url
        self.model = model
        self.ollama_available = False
        self._check_ollama()

    def _check_ollama(self) -> None:
        """Check if Ollama is available and model is loaded."""
        try:
            response = httpx.get(
                f"{self.ollama_url}/api/tags",
                timeout=5.0,
            )
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "") for m in data.get("models", [])]
                if any(self.model in m for m in models):
                    self.ollama_available = True
                    print(f"✓ Ollama available with model {self.model}")
                else:
                    print(f"⚠ Ollama available but model {self.model} not found")
                    print(f"  Available models: {models}")
                    print(f"  Run: ollama pull {self.model}")
        except Exception as e:
            print(f"⚠ Ollama not available at {self.ollama_url}: {e}")
            print("  Insights will use fallback templates")

    async def generate_insight(self, anomaly: Anomaly) -> str:
        """
        Generate an insight for an anomaly.

        Args:
            anomaly: Anomaly object to explain

        Returns:
            Insight string (from LLM or fallback template)
        """
        if self.ollama_available:
            try:
                return await self._generate_with_ollama(anomaly)
            except Exception as e:
                print(f"Error generating insight with Ollama: {e}")
                return self._get_fallback_insight(anomaly)
        else:
            return self._get_fallback_insight(anomaly)

    async def _generate_with_ollama(self, anomaly: Anomaly) -> str:
        """
        Generate insight using Ollama LLM.

        Args:
            anomaly: Anomaly object

        Returns:
            LLM-generated insight
        """
        # Build prompt from template or generic template
        prompt = self._build_prompt(anomaly)

        try:
            # Stream response from Ollama
            response = httpx.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.7,
                },
                timeout=30.0,
            )

            if response.status_code == 200:
                data = response.json()
                insight = data.get("response", "").strip()
                return insight if insight else self._get_fallback_insight(anomaly)
            else:
                return self._get_fallback_insight(anomaly)
        except httpx.TimeoutException:
            print(f"Timeout generating insight for {anomaly.anomaly_type}")
            return self._get_fallback_insight(anomaly)
        except Exception as e:
            print(f"Error calling Ollama: {e}")
            return self._get_fallback_insight(anomaly)

    def _build_prompt(self, anomaly: Anomaly) -> str:
        """
        Build a prompt for the LLM based on the anomaly.

        Args:
            anomaly: Anomaly object

        Returns:
            Prompt string for LLM
        """
        # Check if we have a specialized template for this anomaly type
        if anomaly.anomaly_type in ANOMALY_TEMPLATES:
            template = ANOMALY_TEMPLATES[anomaly.anomaly_type]
            return template.format(
                pod_name=anomaly.pod_name,
                namespace=anomaly.namespace,
                description=anomaly.description,
                metrics_json=str(anomaly.metrics),
            )
        else:
            # Use generic template
            generic_template = ANOMALY_TEMPLATES.get("GENERIC", "")
            return generic_template.format(
                pod_name=anomaly.pod_name,
                namespace=anomaly.namespace,
                anomaly_type=anomaly.anomaly_type,
                description=anomaly.description,
                metrics_json=str(anomaly.metrics),
            )

    def _get_fallback_insight(self, anomaly: Anomaly) -> str:
        """
        Get fallback insight from templates (when Ollama unavailable).

        Args:
            anomaly: Anomaly object

        Returns:
            Fallback insight string
        """
        # Check if we have a fallback for this anomaly type
        if anomaly.anomaly_type in FALLBACK_TEMPLATES:
            template = FALLBACK_TEMPLATES[anomaly.anomaly_type]
            return template.format(
                pod_name=anomaly.pod_name,
                namespace=anomaly.namespace,
                description=anomaly.description,
            )
        else:
            # Use generic fallback
            generic_fallback = FALLBACK_TEMPLATES.get("GENERIC", "")
            return generic_fallback.format(
                pod_name=anomaly.pod_name,
                namespace=anomaly.namespace,
                anomaly_type=anomaly.anomaly_type,
                description=anomaly.description,
            )
