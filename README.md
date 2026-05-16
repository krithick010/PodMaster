# KubeVision AI 🔮

**Next-generation Kubernetes observability with autonomous AI agents**

A full-stack Kubernetes monitoring and alerting platform that combines real-time metrics collection, ML-powered anomaly detection, and LLM-driven insights to provide unprecedented visibility into cluster health.

## ✨ Features

### 🤖 Six Autonomous Detection Agents (Run in Parallel)

1. **CPU Agent** - Detects CPU spikes (>80% warning, >95% critical)
2. **Memory Agent** - Identifies memory leaks and pressure (>80% warning, >95% critical)
3. **Network Agent** - Detects network traffic anomalies (>10MB/s warning, >50MB/s critical)
4. **Storage Agent** ⭐ **NEW** - PVC storage pressure and I/O correlation (>80% warning, >90% critical)
5. **LogIO Agent** ⭐ **NEW** - Pod crash patterns and error rate spikes (>1 err/s warning, >2 err/s critical)
6. **Scheduling Agent** ⭐ **NEW** - Pod scheduling failures and node pressure detection

### 🎯 Key Capabilities

- **Multi-Namespace Support** - Automatic discovery and monitoring across all namespaces
- **Real-Time Dashboard** - WebSocket-driven live updates with zero latency
- **LLM-Powered Insights** - Ollama integration with fallback templates for anomaly explanations
- **Storage Correlation** - Unique PVC + restart count correlation for I/O stress detection
- **Dependency Mapping** - Cross-namespace service dependency tracking and cascading failure detection
- **Forecasting** - EWMA-based trend prediction for proactive scaling
- **Chaos Engine** - Controlled anomaly injection for testing and demos (auto-recover in 90s)
- **Actionable Recommendations** - Auto-generated kubectl commands for remediation

### 🎨 Design

- **Dark-First Cyberpunk UI** - Custom color system with cyan/violet/emerald accents
- **Skeleton Screens** - No spinners, shimmer animations for smooth perceived performance
- **Responsive Grid Layout** - Works on desktop, tablet, mobile
- **Real-Time Animations** - Framer Motion for smooth, engaging transitions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    KubeVision AI Platform                    │
├──────────────────────┬──────────────────┬──────────────────┤
│   Frontend (React)   │  Backend (API)   │   Demo Workload  │
│  - Dashboard UI      │  - FastAPI       │   - student-portal
│  - Real-time Updates │  - Agents        │   - attendance-svc
│  - Charts & Graphs   │  - Orchestrator  │   - result-svc
│  - WebSocket Client  │  - LLM Client    │   - notification-svc
└──────────────────────┴──────────────────┴──────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    Kubernetes         Prometheus          Ollama
    (Pod Metrics)      (Time-Series)      (LLM)
    (Events)           (Multi-Namespace)   (phi3.5)
    (Logs)             (10s scrape)        (fallback)
```

### Data Flow

1. **Metric Collection** (Every 10 seconds)
   - Prometheus API queries multi-namespace pod metrics
   - K8s API fetches pod logs, events, pending status
   - PVC metrics queried via Prometheus volume stats

2. **Anomaly Detection** (Parallel)
   - 6 agents analyze metrics independently
   - Each agent emits Anomaly objects with severity
   - Cross-pod correlation matrix computed

3. **LLM Enrichment** (Per Anomaly)
   - Ollama generates human-readable insight
   - Falls back to template strings if unavailable
   - Stored in SQLite for history

4. **Real-Time Delivery**
   - WebSocket broadcasts snapshot on connect
   - Incremental updates every cycle
   - Client reconnects automatically with exponential backoff

## 📦 Tech Stack

**Backend**
- **FastAPI** 0.110.0 - Async web framework
- **aiosqlite** 0.20.0 - Non-blocking SQLite
- **kubernetes** 29.0.0 - K8s Python client
- **prometheus-api-client** 0.5.4 - Metrics queries
- **numpy/scipy** - Forecasting and correlation
- **httpx** - Async HTTP for Ollama

**Frontend**
- **React** 19 - UI framework
- **Framer Motion** 11 - Animations
- **Recharts** 2.12 - Charts
- **Tailwind CSS** 3.4 - Styling
- **Lucide Icons** - SVG icons
- **React Router** v6 - Navigation

**Infrastructure**
- **Kubernetes** 1.27+ (local Minikube)
- **Prometheus** - Metrics scraping
- **Docker** - Image containerization
- **Ollama** - Local LLM server

## 🚀 Quick Start

### Prerequisites
- Docker
- kubectl
- Minikube
- Node.js 18+
- Python 3.11+

If Minikube is missing on macOS, install it first with `brew install minikube`, then rerun `./quick-start.sh`.

### macOS/Linux
```bash
chmod +x quick-start.sh
./quick-start.sh
```

If your Docker Desktop memory is limited, override the defaults before starting Minikube:
```bash
MINIKUBE_MEMORY=3072 MINIKUBE_CPUS=2 MINIKUBE_DISK_SIZE=15GB ./quick-start.sh
```

### Windows (PowerShell)
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope CurrentUser
.\quick-start.ps1
```

### Access

- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Backend**: http://localhost:8000

## 🔧 Manual Setup

### 1. Build Workload Images

```bash
cd workloads
docker build -t student-portal student-portal/
docker build -t attendance-service attendance-service/
docker build -t result-service result-service/
docker build -t notification-service notification-service/
cd ..
```

### 2. Create Namespaces & RBAC

```bash
kubectl apply -f k8s/namespaces.yaml
kubectl apply -f k8s/rbac.yaml
```

### 3. Deploy Workloads

```bash
kubectl apply -f k8s/university-frontend/
kubectl apply -f k8s/university-backend/
kubectl apply -f k8s/university-data/
```

### 4. Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs on **http://localhost:8000**

### 5. Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on **http://localhost:3000**

## 🧪 Testing Anomalies

Use the Chaos Control interface or curl:

```bash
# CPU Spike
curl.exe -X POST "http://localhost:8000/api/simulate/cpu-spike?pod=student-portal&namespace=university-frontend"

# Memory Leak
curl.exe -X POST "http://localhost:8000/api/simulate/memory-leak?pod=student-portal&namespace=university-frontend"

# Storage Pressure
curl.exe -X POST "http://localhost:8000/api/simulate/storage-pressure?pod=attendance-service&namespace=university-backend"

# Log Flood
curl.exe -X POST "http://localhost:8000/api/simulate/log-flood?pod=notification-service&namespace=university-frontend"

# Network Spike
curl.exe -X POST "http://localhost:8000/api/simulate/network-spike?pod=result-service&namespace=university-backend"
```

All simulations **auto-recover after 90 seconds**.

## 📊 API Endpoints

### Metrics
- `GET /api/namespaces` - All namespaces
- `GET /api/metrics/current?namespace=all` - Pod metrics
- `GET /api/storage?namespace=all` - PVC metrics
- `GET /api/forecast?pod_name=<name>` - Forecasts

### Anomalies
- `GET /api/anomalies/current` - Latest anomalies
- `GET /api/anomalies/history?hours=24` - Historical data
- `GET /api/anomalies/export?hours=24` - CSV export

### Agents
- `GET /api/agents/status` - Agent statuses and findings
- `GET /api/summary/health` - Cluster health score (A-F)

### Analysis
- `GET /api/dependencies` - Service dependency graph
- `GET /api/correlations` - Cross-pod correlations
- `GET /api/recommendations` - Actionable remediation steps

### WebSocket
- `WS /ws/metrics` - Real-time updates (connect and receive snapshot, then incremental updates)

### Demo/Testing
- `POST /api/simulate/{cpu,memory,storage,log,network}-spike` - Chaos injection
- `GET/POST /api/chaos/status, /enable, /disable` - Chaos engine control

## 📁 Project Structure

```
PodMaster/
├── backend/
│   ├── agents/
│   │   ├── base_agent.py
│   │   ├── cpu_agent.py
│   │   ├── memory_agent.py
│   │   ├── network_agent.py
│   │   ├── storage_agent.py         ⭐ NEW
│   │   ├── logio_agent.py           ⭐ NEW
│   │   ├── scheduling_agent.py      ⭐ NEW
│   │   └── orchestrator.py
│   ├── llm/
│   │   ├── insight_generator.py
│   │   └── prompt_templates.py
│   ├── metrics/
│   │   ├── prometheus_client.py
│   │   └── k8s_client.py
│   ├── storage/
│   │   ├── database.py
│   │   └── models.py
│   ├── forecasting.py
│   ├── correlation.py
│   ├── recommendations.py
│   ├── chaos_engine.py
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── AgentStatusStrip.jsx
│   │   │   ├── MetricsPanel.jsx
│   │   │   ├── AnomalyTimeline.jsx
│   │   │   ├── ChaosControl.jsx
│   │   │   ├── HealthScore.jsx
│   │   │   └── ... (15+ more)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── About.jsx
│   │   │   └── Namespaces.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   └── useNamespace.js
│   │   ├── context/
│   │   │   ├── ThemeContext.js
│   │   │   └── NamespaceContext.js
│   │   ├── index.css
│   │   ├── App.jsx
│   │   └── index.js
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── workloads/
│   ├── student-portal/
│   │   ├── app.py
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   ├── attendance-service/
│   ├── result-service/
│   └── notification-service/
│
├── k8s/
│   ├── namespaces.yaml
│   ├── rbac.yaml
│   ├── university-frontend/
│   ├── university-backend/
│   └── university-data/
│
├── .env.example
├── quick-start.sh
├── quick-start.ps1
└── README.md
```

## 🎓 Demo Walkthrough

1. **Open Dashboard** - http://localhost:3000
   - See real-time pod metrics, agent status, cluster health

2. **Generate CPU Load** - Use Chaos Control or curl:
   ```bash
   curl -X POST "http://localhost:8000/api/simulate/cpu-spike?pod=student-portal&namespace=university-frontend"
   ```
   - Watch CPU Agent activate and alert in real-time
   - See LLM insight explain the spike

3. **Test Storage Pressure** - Chaos trigger or direct:
   ```bash
   curl -X POST "http://localhost:8000/api/simulate/storage-pressure?pod=attendance-service&namespace=university-backend"
   ```
   - Storage Agent detects PVC pressure
   - If restarts detected, shows unique correlation

4. **Check Recommendations**
   - Platform suggests `kubectl scale deployment student-portal --replicas=3`
   - Or `kubectl patch pvc attendance-pvc --patch='{"spec":{"resources":{"requests":{"storage":"10Gi"}}}}'`

5. **Monitor Timeline**
   - Anomalies appear in real-time timeline
   - Each anomaly links to metrics and LLM insight

## 🔐 Security

- **RBAC Enabled** - Dedicated `kubevision-backend` service account with limited permissions
- **No Root** - All containers run as non-root
- **Secret Management** - Use `.env` for sensitive config (Ollama URL, DB path, etc.)

## 📈 Performance

- **Backend Latency** - <100ms for most queries (aiosqlite async, no blocking)
- **Frontend Update Rate** - 10 Hz via WebSocket (100ms per cycle)
- **Prometheus Scrape** - 10-second interval
- **Storage** - SQLite with 7-day retention, auto-cleanup

## 🧠 LLM Integration

### Ollama Setup

```bash
# Install Ollama: https://ollama.ai
ollama pull phi3.5
ollama serve
```

Default model: `phi3.5:latest` (can be overridden in `.env`)

### Fallback Templates

If Ollama unavailable:
- Uses pre-defined templates for common anomalies
- Supports `{pod_name}`, `{namespace}`, `{description}`, `{metrics_json}` interpolation
- Always returns human-readable explanation

## 🐛 Troubleshooting

**Backend won't start**
- Check Python version: `python --version` (need 3.11+)
- Check Prometheus connectivity: `curl http://prometheus:9090/api/v1/query`
- Check Kubernetes: `kubectl cluster-info`

**Frontend not updating**
- Check WebSocket: Browser DevTools → Network → WS → /ws/metrics
- Check CORS: Should show `Access-Control-Allow-Origin: *`
- Check connection status in header (green dot = connected)

**Anomalies not detected**
- Generate load: `curl http://student-portal.university-frontend/load` (CPU spike)
- Wait 10 seconds for first collection cycle
- Check API: `curl http://localhost:8000/api/anomalies/current`

## 📝 Configuration

Create `.env` file in project root:

```env
# Prometheus
PROMETHEUS_URL=http://prometheus:9090
PROMETHEUS_SCRAPE_INTERVAL=10

# Kubernetes
KUBECONFIG=~/.kube/config

# LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=phi3.5:latest

# Database
DB_PATH=./kubevision.db

# Collection
COLLECTION_INTERVAL=10
```

See `.env.example` for all options.

## 🚢 Deployment Options

### Minikube (Development)
```bash
./quick-start.sh
```

### Docker Compose (Single machine)
Use provided `docker-compose.yml` with all services

### Kubernetes Cluster (Production-like)
```bash
kubectl apply -f k8s/
```

### Multi-Cluster (Enterprise)
Can be adapted for monitoring multiple clusters by running multiple backend instances with different KUBECONFIG contexts

## 📊 Monitoring KubeVision Itself

Backend exposes Prometheus metrics on `/metrics`:
- `agent_runs_total` - Total agent executions
- `anomalies_detected_total` - Total anomalies
- `collection_duration_seconds` - Time per collection cycle

Add to Prometheus scrape config:
```yaml
- job_name: 'kubevision'
  static_configs:
    - targets: ['localhost:8000']
```

## 🤝 Contributing

Issues and PRs welcome! Please follow:
- Backend: Python 3.11+, async/await patterns, type hints
- Frontend: React hooks, Tailwind utilities, Framer Motion animations

## 📄 License

Competition Project - Unlicensed

## 🎯 Roadmap

- [ ] GPU monitoring (NVIDIA DCGM)
- [ ] Advanced anomaly ML (isolation forest, autoencoders)
- [ ] Multi-region federation
- [ ] Custom alerting rules editor
- [ ] Webhook integration (Slack, PagerDuty)
- [ ] Historical trend analysis dashboard
- [ ] Anomaly root cause analysis with causal graphs

## 📧 Contact

For competition judges or technical questions, see About page in dashboard.

---

**Built with ❤️ for next-generation Kubernetes observability**
