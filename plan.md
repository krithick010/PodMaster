# Plan: Multi-Agent LLM Pipeline with Real Prometheus + K8s Logs

## What We're Building

```
Prometheus (every 10s) + K8s Logs
         │
    MetricSplitter
         │
  ┌──────┴──────┬──────┬──────┬──────┬──────┐
  CPU     Memory  Net  Storage LogIO  Sched
 Agent   Agent  Agent  Agent  Agent  Agent
  └──────┬──────┴──────┴──────┴──────┴──────┘
         │  (all run in parallel via asyncio)
   Coordinator Agent (LangChain + OpenRouter)
         │
   FastAPI WebSocket → React Dashboard
```

Each specialist agent runs its existing `analyze()` threshold check, then passes findings to an LLM for a domain-specific insight. The coordinator receives all 6 reports and synthesizes a root-cause + action plan. Both streams (fast threshold checks + slow LLM analysis) run in parallel so real-time detection is never blocked.

> **Why not CrewAI:** CrewAI requires Python <=3.13. This project runs Python 3.14. We implement the same pattern directly with `langchain-openai` + `asyncio` — same architecture, no package constraint.

---

## Steps

### 1. Fix Real Log Metrics ✅ DONE
`backend/metrics/k8s_client.py` — added `get_log_error_rates()` that reads real pod logs and counts ERROR/WARN/crash patterns.  
`backend/main.py` — replaced hardcoded zero log_metrics with real call + proper merge.

---

### 2. Install Dependencies ✅ DONE
`backend/requirements.txt` — added `langchain-openai>=1.2.0`.  
`.env` — added `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `AGENT_LLM_BASE_URL`, `AGENT_LLM_MODEL`.

---

### 3. Build the Multi-Agent Pipeline

**New file:** `backend/agents/agent_pipeline.py`

**3a. LLM config** — `ChatOpenAI(base_url=AGENT_LLM_BASE_URL, api_key=OPENROUTER_API_KEY, model=AGENT_LLM_MODEL)`.

**3b. MetricSplitter** — splits the full `agent_metrics` dict into 6 domain-specific slices (cpu, memory, network, storage, logio, scheduling).

**3c. 6 async specialist functions** — each calls the existing agent's `analyze()`, then calls the LLM with a focused prompt to produce a structured insight:
```python
async def run_cpu_specialist(metrics_slice, llm) -> dict:
    anomalies = await CPUAgent().analyze(metrics_slice)
    insight = await llm.ainvoke(cpu_prompt(anomalies))
    return {"severity": ..., "insight": ..., "recommendation": ..., "anomalies": [...]}
```
Same pattern for memory, network, storage, logio, scheduling.

**3d. Coordinator function** — receives all 6 specialist results, calls LLM once with a synthesis prompt:
```python
async def run_coordinator(specialist_results, llm) -> dict:
    # identifies causal chains, root cause, top 3 actions, blast radius
```

**3e. Pipeline entry point:**
```python
async def run_agent_pipeline(agent_metrics: dict) -> dict:
    slices = split_metrics(agent_metrics)
    llm = get_llm()
    # Run all 6 specialists in parallel
    results = await asyncio.gather(
        run_cpu_specialist(slices["cpu"], llm),
        run_memory_specialist(slices["memory"], llm),
        run_network_specialist(slices["network"], llm),
        run_storage_specialist(slices["storage"], llm),
        run_logio_specialist(slices["logio"], llm),
        run_scheduling_specialist(slices["scheduling"], llm),
    )
    coordinator_result = await run_coordinator(results, llm)
    return {"agents": {...}, "coordinator": coordinator_result}
```

**Output contract:**
```json
{
  "agents": {
    "cpu":        { "severity": "critical", "insight": "...", "recommendation": "...", "anomalies": [] },
    "memory":     { "severity": "ok",       "insight": "...", "recommendation": "...", "anomalies": [] },
    "network":    { ... },
    "storage":    { ... },
    "logio":      { ... },
    "scheduling": { ... }
  },
  "coordinator": {
    "summary": "...",
    "root_cause": "...",
    "causal_chain": ["CPU spike → OOM → restart → scheduling pressure"],
    "top_actions": [
      {"priority": 1, "action": "...", "command": "kubectl ..."}
    ],
    "blast_radius": ["namespace/pod"],
    "overall_severity": "critical"
  },
  "timestamp": "..."
}
```

---

### 4. Integrate into `main.py`

After the existing fast agent loop in `collect_and_analyze()`:

```python
# Fast path (unchanged) — threshold checks, no LLM, ~5ms
agent_results = await orchestrator.run_all_agents(agent_metrics)
all_findings = orchestrator.get_all_findings()

# Slow path — LLM pipeline, only fires when findings exist + 30s cooldown
if all_findings and _should_run_pipeline():
    asyncio.create_task(_run_and_broadcast_pipeline(agent_metrics))
```

`_run_and_broadcast_pipeline`:
1. Broadcasts `{"type": "agent_pipeline_loading"}` immediately → UI shows spinner
2. Calls `run_agent_pipeline(agent_metrics)`
3. Broadcasts `{"type": "agent_pipeline", "data": result}` when done
4. Stores result in `last_pipeline_result` global

Add REST endpoint:
```python
@app.get("/api/pipeline/analysis")
async def get_pipeline_analysis():
    return last_pipeline_result or {"status": "pending"}
```

---

### 5. Frontend

**`frontend/src/hooks/useWebSocket.js`**
- Add `pipelineAnalysis` + `pipelineLoading` state
- Handle `agent_pipeline_loading` → `pipelineLoading = true`
- Handle `agent_pipeline` → `pipelineAnalysis = data`, `pipelineLoading = false`

**New: `frontend/src/components/AgentInsightCard.jsx`**
- Left border color = severity (red/yellow/green)
- Agent icon + name + severity badge
- Insight text
- Recommendation in a highlighted box
- Anomaly count + last-analyzed timestamp

**New: `frontend/src/components/AgentPipelineFlow.jsx`**
- Visual flow: Prometheus → Splitter → 6 agent nodes → Coordinator
- Each node lights up based on severity
- Animated with framer-motion

**New: `frontend/src/components/PipelineAnalysisPanel.jsx`**
- Executive summary (large, prominent)
- Root cause + causal chain
- Top 3 actions with `kubectl` commands and copy buttons
- Blast radius list

**`frontend/src/pages/Dashboard.jsx`**
- Add new row after AI Recommendations:
  ```jsx
  <AgentPipelineFlow />
  <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
    {/* 6 AgentInsightCards */}
  </div>
  <PipelineAnalysisPanel />
  ```

---

## Implementation Order

| # | File | Change | Status |
|---|------|--------|--------|
| 1 | `backend/metrics/k8s_client.py` | Add `get_log_error_rates()` | ✅ Done |
| 2 | `backend/main.py` | Wire real log metrics | ✅ Done |
| 3 | `backend/requirements.txt` + `.env` | Add langchain-openai, env vars | ✅ Done |
| 4 | `backend/agents/agent_pipeline.py` | NEW — full pipeline | ⬜ |
| 5 | `backend/main.py` | Integrate pipeline + `/api/pipeline/analysis` | ⬜ |
| 6 | `frontend/src/hooks/useWebSocket.js` | Add pipelineAnalysis state | ⬜ |
| 7 | `frontend/src/components/AgentInsightCard.jsx` | NEW | ⬜ |
| 8 | `frontend/src/components/AgentPipelineFlow.jsx` | NEW | ⬜ |
| 9 | `frontend/src/components/PipelineAnalysisPanel.jsx` | NEW | ⬜ |
| 10 | `frontend/src/pages/Dashboard.jsx` | Add new rows | ⬜ |

---

## Key Decisions

- **No mock data** — if Prometheus or K8s is unreachable, the pipeline errors loudly.
- **Two parallel paths** — fast threshold agents (~5ms) + slow LLM analysis (~5-15s). Real-time detection is never blocked.
- **LLM pipeline runs only on findings** — skip LLM calls when cluster is healthy to save cost and latency.
- **OpenRouter as LLM backend** — already configured in the project, reused via OpenAI-compatible endpoint.
- **All async** — `asyncio.gather` for parallel specialist runs, `ainvoke` for non-blocking LLM calls.
