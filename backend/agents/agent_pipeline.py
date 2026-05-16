"""
Multi-Agent LLM Pipeline for PodMaster.

Architecture:
  - MetricSplitter: carves the full agent_metrics dict into 6 domain slices
  - 6 Specialist functions: each runs its existing agent.analyze() for threshold
    detection, then calls the LLM for a domain-specific insight
  - Coordinator function: receives all 6 specialist results, calls LLM once to
    synthesize root cause, causal chain, top actions, and blast radius
  - run_agent_pipeline(): entry point — runs all 6 specialists in parallel via
    asyncio.gather, then runs the coordinator, returns structured JSON

LLM backend: langchain-openai → OpenRouter (OpenAI-compatible endpoint).
Reads OPENROUTER_API_KEY, AGENT_LLM_BASE_URL, AGENT_LLM_MODEL from env.
"""

import asyncio
import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

from agents.base_agent import Anomaly, AnomalySeverity
from agents.cpu_agent import CPUAgent
from agents.memory_agent import MemoryAgent
from agents.network_agent import NetworkAgent
from agents.storage_agent import StorageAgent
from agents.logio_agent import LogIOAgent
from agents.scheduling_agent import SchedulingAgent


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _get_llm() -> ChatOpenAI:
    """Build a ChatOpenAI client pointed at OpenRouter."""
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    base_url = os.getenv("AGENT_LLM_BASE_URL", "https://openrouter.ai/api/v1")
    model = os.getenv("AGENT_LLM_MODEL", "openrouter/auto")

    if not api_key or api_key == "your_openrouter_api_key_here":
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set. "
            "Add it to your .env file before running the agent pipeline."
        )

    return ChatOpenAI(
        base_url=base_url,
        api_key=api_key,
        model=model,
        max_tokens=400,
        temperature=0.3,
        default_headers={
            "HTTP-Referer": "https://podmaster.ai",
            "X-Title": "PodMaster AI",
        },
    )


# ---------------------------------------------------------------------------
# MetricSplitter
# ---------------------------------------------------------------------------

def split_metrics(agent_metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Split the full agent_metrics dict into 6 domain-specific slices.
    Each specialist receives only the data it needs.
    """
    pod_metrics = agent_metrics.get("pod_metrics", {})
    pvc_metrics = agent_metrics.get("pvc_metrics", {})
    pending_pods = agent_metrics.get("pending_pods", [])
    failed_pods = agent_metrics.get("failed_pods", [])
    node_pressures = agent_metrics.get("node_pressures", [])

    return {
        # CPU, Memory, Network, LogIO all need pod_metrics
        "cpu":        {"pod_metrics": pod_metrics},
        "memory":     {"pod_metrics": pod_metrics},
        "network":    {"pod_metrics": pod_metrics},
        "logio":      {"pod_metrics": pod_metrics},
        # Storage needs both PVC metrics and pod metrics (for restart correlation)
        "storage":    {"pvc_metrics": pvc_metrics, "pod_metrics": pod_metrics},
        # Scheduling needs pending/failed pods and node conditions
        "scheduling": {
            "pending_pods":  pending_pods,
            "failed_pods":   failed_pods,
            "node_pressures": node_pressures,
        },
    }


# ---------------------------------------------------------------------------
# Severity helpers
# ---------------------------------------------------------------------------

def _overall_severity(anomalies: List[Anomaly]) -> str:
    """Return the highest severity across a list of anomalies."""
    if not anomalies:
        return "ok"
    severities = [a.severity for a in anomalies]
    if AnomalySeverity.CRITICAL in severities:
        return "critical"
    if AnomalySeverity.WARNING in severities:
        return "warning"
    return "info"


def _anomalies_summary(anomalies: List[Anomaly]) -> str:
    """Compact text summary of anomalies for LLM prompts."""
    if not anomalies:
        return "No anomalies detected."
    lines = []
    for a in anomalies[:8]:  # cap at 8 to keep prompt size sane
        lines.append(
            f"  [{a.severity.value.upper()}] {a.anomaly_type} — "
            f"{a.namespace}/{a.pod_name}: {a.description}"
        )
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# LLM call helper
# ---------------------------------------------------------------------------

async def _call_llm(llm: ChatOpenAI, system: str, user: str) -> str:
    """Invoke the LLM and return the text content."""
    messages = [SystemMessage(content=system), HumanMessage(content=user)]
    response = await llm.ainvoke(messages)
    return response.content.strip()


def _parse_json_response(text: str, fallback: Dict) -> Dict:
    """
    Try to extract a JSON object from the LLM response.
    LLMs sometimes wrap JSON in markdown fences — strip those first.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip().rstrip("`").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find the first {...} block
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return fallback


# ---------------------------------------------------------------------------
# Specialist runners
# ---------------------------------------------------------------------------

async def _run_specialist(
    domain: str,
    agent_instance,
    metrics_slice: Dict[str, Any],
    llm: ChatOpenAI,
) -> Dict[str, Any]:
    """
    Generic specialist runner:
      1. Run the existing agent.analyze() for threshold-based detection
      2. Call LLM for a domain-specific insight + recommendation
      3. Return structured result dict
    """
    try:
        anomalies: List[Anomaly] = await agent_instance.analyze(metrics_slice)
        severity = _overall_severity(anomalies)
        summary = _anomalies_summary(anomalies)

        system_prompt = (
            f"You are a Kubernetes {domain} specialist. "
            "Respond ONLY with a valid JSON object — no markdown, no extra text."
        )
        user_prompt = (
            f"Domain: {domain.upper()}\n"
            f"Detected anomalies:\n{summary}\n\n"
            "Return a JSON object with exactly these keys:\n"
            '  "insight": "1-2 sentence expert analysis of what is happening",\n'
            '  "recommendation": "specific actionable fix (include kubectl command if applicable)"\n'
        )

        llm_response = await _call_llm(llm, system_prompt, user_prompt)
        parsed = _parse_json_response(llm_response, {
            "insight": llm_response,
            "recommendation": "Review the anomalies above and take corrective action.",
        })

        return {
            "severity": severity,
            "anomaly_count": len(anomalies),
            "insight": parsed.get("insight", ""),
            "recommendation": parsed.get("recommendation", ""),
            "anomalies": [a.to_dict() for a in anomalies],
        }

    except Exception as e:
        print(f"[agent_pipeline] {domain} specialist error: {e}")
        return {
            "severity": "error",
            "anomaly_count": 0,
            "insight": f"Specialist encountered an error: {e}",
            "recommendation": "",
            "anomalies": [],
            "error": str(e),
        }


async def _run_cpu_specialist(slices: Dict, llm: ChatOpenAI) -> Dict:
    return await _run_specialist("cpu", CPUAgent(), slices["cpu"], llm)

async def _run_memory_specialist(slices: Dict, llm: ChatOpenAI) -> Dict:
    return await _run_specialist("memory", MemoryAgent(), slices["memory"], llm)

async def _run_network_specialist(slices: Dict, llm: ChatOpenAI) -> Dict:
    return await _run_specialist("network", NetworkAgent(), slices["network"], llm)

async def _run_storage_specialist(slices: Dict, llm: ChatOpenAI) -> Dict:
    return await _run_specialist("storage", StorageAgent(), slices["storage"], llm)

async def _run_logio_specialist(slices: Dict, llm: ChatOpenAI) -> Dict:
    return await _run_specialist("logio", LogIOAgent(), slices["logio"], llm)

async def _run_scheduling_specialist(slices: Dict, llm: ChatOpenAI) -> Dict:
    return await _run_specialist("scheduling", SchedulingAgent(), slices["scheduling"], llm)


# ---------------------------------------------------------------------------
# Coordinator
# ---------------------------------------------------------------------------

async def _run_coordinator(
    specialist_results: Dict[str, Dict],
    llm: ChatOpenAI,
) -> Dict[str, Any]:
    """
    Coordinator receives all 6 specialist results and synthesizes:
      - Executive summary
      - Root cause
      - Causal chain (e.g. CPU spike → OOM → restart → scheduling failure)
      - Top 3 prioritised actions with kubectl commands
      - Blast radius (affected namespaces/pods)
      - Overall severity
    """
    try:
        # Build a compact report for the coordinator prompt
        report_lines = []
        for domain, result in specialist_results.items():
            sev = result.get("severity", "ok")
            count = result.get("anomaly_count", 0)
            insight = result.get("insight", "No issues.")
            rec = result.get("recommendation", "")
            report_lines.append(
                f"[{domain.upper()} — {sev.upper()} — {count} anomalies]\n"
                f"  Insight: {insight}\n"
                f"  Recommendation: {rec}"
            )
        full_report = "\n\n".join(report_lines)

        system_prompt = (
            "You are a senior SRE with deep Kubernetes expertise. "
            "You receive reports from 6 specialist agents and synthesize them into a "
            "unified incident analysis. "
            "Respond ONLY with a valid JSON object — no markdown, no extra text."
        )
        user_prompt = (
            "Specialist agent reports:\n\n"
            f"{full_report}\n\n"
            "Synthesize these into a unified incident analysis. "
            "Return a JSON object with exactly these keys:\n"
            '  "summary": "30-second executive summary of the cluster state",\n'
            '  "root_cause": "most likely root cause if multiple agents fired, or None",\n'
            '  "causal_chain": ["step1 → step2 → step3"],\n'
            '  "top_actions": [\n'
            '    {"priority": 1, "action": "description", "command": "kubectl ..."},\n'
            '    {"priority": 2, "action": "description", "command": "kubectl ..."},\n'
            '    {"priority": 3, "action": "description", "command": "kubectl ..."}\n'
            '  ],\n'
            '  "blast_radius": ["namespace/pod or namespace-wide"],\n'
            '  "overall_severity": "ok|warning|critical"\n'
        )

        llm_response = await _call_llm(llm, system_prompt, user_prompt)
        parsed = _parse_json_response(llm_response, {
            "summary": llm_response,
            "root_cause": None,
            "causal_chain": [],
            "top_actions": [],
            "blast_radius": [],
            "overall_severity": "unknown",
        })

        # Ensure required keys exist with safe defaults
        return {
            "summary":          parsed.get("summary", ""),
            "root_cause":       parsed.get("root_cause"),
            "causal_chain":     parsed.get("causal_chain", []),
            "top_actions":      parsed.get("top_actions", []),
            "blast_radius":     parsed.get("blast_radius", []),
            "overall_severity": parsed.get("overall_severity", "unknown"),
        }

    except Exception as e:
        print(f"[agent_pipeline] coordinator error: {e}")
        return {
            "summary": f"Coordinator encountered an error: {e}",
            "root_cause": None,
            "causal_chain": [],
            "top_actions": [],
            "blast_radius": [],
            "overall_severity": "error",
            "error": str(e),
        }


# ---------------------------------------------------------------------------
# Pipeline entry point
# ---------------------------------------------------------------------------

async def run_agent_pipeline(agent_metrics: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the full multi-agent LLM pipeline.

    1. Split metrics into 6 domain slices
    2. Run all 6 specialists in parallel (asyncio.gather)
    3. Run coordinator with all specialist results
    4. Return structured output matching the plan's output contract

    Args:
        agent_metrics: The full metrics dict from collect_and_analyze()

    Returns:
        {
            "agents": {
                "cpu": { severity, anomaly_count, insight, recommendation, anomalies },
                "memory": { ... },
                "network": { ... },
                "storage": { ... },
                "logio": { ... },
                "scheduling": { ... },
            },
            "coordinator": {
                summary, root_cause, causal_chain, top_actions,
                blast_radius, overall_severity
            },
            "timestamp": ISO string
        }

    Raises:
        RuntimeError: if OPENROUTER_API_KEY is not configured
    """
    llm = _get_llm()
    slices = split_metrics(agent_metrics)

    # Run all 6 specialists concurrently
    (
        cpu_result,
        memory_result,
        network_result,
        storage_result,
        logio_result,
        scheduling_result,
    ) = await asyncio.gather(
        _run_cpu_specialist(slices, llm),
        _run_memory_specialist(slices, llm),
        _run_network_specialist(slices, llm),
        _run_storage_specialist(slices, llm),
        _run_logio_specialist(slices, llm),
        _run_scheduling_specialist(slices, llm),
    )

    specialist_results = {
        "cpu":        cpu_result,
        "memory":     memory_result,
        "network":    network_result,
        "storage":    storage_result,
        "logio":      logio_result,
        "scheduling": scheduling_result,
    }

    coordinator_result = await _run_coordinator(specialist_results, llm)

    return {
        "agents":      specialist_results,
        "coordinator": coordinator_result,
        "timestamp":   datetime.utcnow().isoformat(),
    }
