# PodMaster 🔮
**Enterprise Kubernetes SRE & AI Observability Platform**

A full-stack, state-of-the-art Kubernetes monitoring, root cause analysis, and chaos engineering platform. PodMaster combines real-time multi-namespace metrics collection, parallel AI daemon anomaly detection, and natural language LLM synthesis to provide unprecedented observability into cluster health.

---

## ✨ Enterprise SRE & Observability Features

### 🤖 Multi-Agent Anomaly Detection Subsystem
Six autonomous daemons run continuously in parallel every 10-second collection cycle:
1. **CPU Agent** - Detects cgroup core utilization spikes (>80% warning, >95% critical).
2. **Memory Agent** - Identifies working set saturation and OOM risks (>80% warning, >95% critical).
3. **Network Agent** - Monitors packet loss, throughput anomalies, and latency spikes.
4. **Storage Agent** - Tracks PVC volume exhaustion and I/O saturation.
5. **LogIO Agent** - Synchronizes container log streams with CPU/memory saturation spikes.
6. **Scheduling Agent** - Detects pod eviction, scheduling bottlenecks, and node pressure.
7. **Orchestrator** - Clusters concurrent anomalies into unified Root Cause Analysis (RCA) incident records.

### 🎯 15 Core Observability Pillars
- **Golden Signals v2** - Dedicated real-time tracking for Traffic (RPS), Latency (ms), Error Rate (%), and Saturation (%).
- **Service Level Objectives (SLOs) & Error Budgets** - Automated tracking of 99.9% availability targets with remaining error budget progress bars.
- **Service Topology Map v2** - High-contrast Cytoscape.js network graph colored by node health (`OK`, `WARN`, `CRIT`) with white compound namespace pill badges.
- **Cluster Explorer Hierarchy** - Expandable tree navigation (`Cluster` → `Namespaces` → `Deployments` → `Pods`) embedded directly in the sidebar.
- **RCA Incident Records** - Automated detection of multi-symptom cluster incidents with suspected root causes.
- **Alert Rules Automation** - Configurable alerting threshold engine with active trigger status.
- **Logs + Metrics Correlation** - Visual timeline matching resource saturation spikes directly with correlated log output.
- **Top Problem Hotspots** - Aggregated rankings of problem pods sorted by CPU, Memory, Restart Counts, and Error Rates.
- **"Ask PodMaster" Natural Language AI Query Bar** - Instant conversational SRE interaction powered by full cluster telemetry context.
- **Deep-Dive AI RCA Report Generator** - On-demand structured SRE incident reports (Impact, Timeline, Root Cause, Remediation Next Steps).
- **Namespace Health & Cost Overview** - Efficiency ratings, resource allocation breakdowns, and cost optimization scores per namespace.
- **Backend CacheManager** - Ultra-low latency aggregation layer refreshed asynchronously every 10 seconds.
- **Config Event Overlays** - Real-time tracking of deployment updates, autoscale triggers, and configuration changes.
- **LLM Observability Telemetry** - Performance monitoring for the AI reasoning engine (rolling latency, total requests, success rates).
- **Resilient Fallback Architecture** - Seamless transition to clearly labeled simulated telemetry with "DEMO MODE" badges when external daemons are unreachable.

### ⚡ Chaos Engineering Sandbox & Undo Mechanics
- **5 Controlled Scenarios**: CPU Stress, Memory Leak, I/O Pressure, Network Throttling, and Log Flood.
- **5-Second Staging Revoke Window**: Triggering any scenario initiates a 5-second countdown with an explicit **"REVOKE (5s)"** button, allowing operators to safely cancel unintended destructive tests.
- **Active Subroutine Cancellation**: Active chaos injections feature individual red **Trash icon** abort controls alongside a global **"Abort All"** emergency stop.
- **Autonomous Recovery**: All chaos simulations gracefully auto-recover to nominal state after 90 seconds.

---

## 🖥️ Tabbed Workspace Architecture (`Dashboard.jsx`)

PodMaster features an elegant, premium light-theme UI organized into a clean 5-view tabbed workspace:
1. **Overview & Signals**: Live Golden Signals, SLO availability, and Namespace Cost allocations.
2. **Topology & Hotspots**: Interactive Cytoscape Service Topology Map and Top Problem Pods rankings.
3. **AI & Correlations**: Ask PodMaster AI search bar, Multi-Agent daemons, and Log-Metric correlation streams.
4. **Alerts & Timeline**: Configurable Alert Rules panel and Anomaly Incident Timeline with config change overlays.
5. **Chaos Sandbox**: Cyberpunk terminal-style Chaos Control Center for fault injection and self-healing verification.

### 🤖 Persistent Floating AI Assistant
A global SRE copilot modal (`FloatingAIAssistant.jsx`) is docked in the bottom right corner across all application routes, offering instant query resolution, diagnostic prompt shortcuts, and real-time streaming answers.

---

## 🏛️ Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PodMaster SRE Platform                      │
├──────────────────────┬──────────────────────┬───────────────────┤
│   Frontend (React)   │   Backend (FastAPI)  │   Demo Cluster    │
│  - 5-Tab Workspace   │  - Multi-Agent Loop  │   - student-portal
│  - Cytoscape Map     │  - CacheManager      │   - attendance-svc
│  - WebSocket Sync    │  - LLM Synthesizer   │   - result-svc
│  - Floating Copilot  │  - SQLite Database   │   - notif-svc     │
└──────────────────────┴──────────────────────┴───────────────────┘
            │                     │                     │
      ┌─────┴───────────────┐     ├─────────────────────┤
      ▼                     ▼     ▼                     ▼
 WebSocket              Prometheus Client           Ollama / OpenRouter
 (100ms sync)           (10s Scrape Engine)         (Phi-3 AI Subsystem)
```

### Cluster Workload Distribution (9 Active Pods)
The demo Kubernetes university microservices cluster contains precisely 9 active pods across 3 namespaces:
- **`university-frontend`**: `student-portal-0`, `student-portal-1`, `notification-service-0`, `notification-service-1`
- **`university-backend`**: `attendance-service-0`, `attendance-service-1`, `result-service-0`, `result-service-1`
- **`university-data`**: `postgres-db-0` (Persistent PostgreSQL database with PVC monitoring)

---

## 📦 Tech Stack

### Backend
- **FastAPI** (`0.110.0`): High-performance async API backend.
- **aiosqlite** (`0.20.0`): Non-blocking asynchronous SQLite engine for RCA and SLO storage.
- **kubernetes** (`29.0.0`): Kubernetes API client for pod logs and events.
- **prometheus-api-client**: Direct PromQL time-series metrics extraction.
- **httpx**: Asynchronous HTTP communication with Ollama/OpenRouter LLMs.

### Frontend
- **React 19 & Vite**: Ultra-fast modern frontend build system.
- **Framer Motion**: Smooth micro-animations and seamless view transitions.
- **Cytoscape.js & cose-bilkent**: High-performance force-directed topology rendering.
- **Recharts**: Responsive SVG time-series charts.
- **Lucide Icons**: Beautiful, clean vector iconography.

---

## 🚀 Quick Start

### Prerequisites
- Minikube running with Prometheus installed
- Python 3.11+
- Node.js 18+

### 1. Start Backend Server
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend runs on **http://localhost:8000** (Swagger API Documentation at `http://localhost:8000/docs`).

### 2. Start Frontend Server
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on **http://localhost:5173**.

### 3. Build Production Bundle
```bash
cd frontend
npm run build
```
Transforms all 2,993 modules into highly optimized production assets.

---

## 🧪 Simulation & Testing Guide

You can trigger controlled anomalies directly from the **Chaos Sandbox** tab in the UI or via terminal `curl`:
```bash
# CPU Stress Injection
curl -X POST "http://localhost:8000/api/simulate/cpu-spike?pod_name=student-portal&namespace=university-frontend"

# Memory Leak Injection
curl -X POST "http://localhost:8000/api/simulate/memory-leak?pod_name=result-service-0&namespace=university-backend"

# PVC Storage Saturation
curl -X POST "http://localhost:8000/api/simulate/storage-pressure?pod_name=attendance-service&namespace=university-backend"
```
*All chaos injections automatically terminate after 90 seconds or can be instantly revoked using the red Trash icon buttons in the UI.*

---

## 🔐 Security & Permissions
- **RBAC Strict Isolation**: Uses dedicated service accounts with least-privilege role bindings.
- **Read-Only Telemetry Default**: Telemetry collection loops operate completely read-only against Prometheus endpoints.
- **Configurable Fallbacks**: Secure `.env` environment loading for custom LLM endpoint routing.

---

**Built with ❤️ for next-generation Kubernetes SRE & AI Observability**
