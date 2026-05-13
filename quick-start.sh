#!/bin/bash

set -e

echo "🚀 KubeVision AI - Quick Start"
echo "=============================="

# Check prerequisites
echo "✓ Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "Docker not found"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found"; exit 1; }
if ! command -v minikube >/dev/null 2>&1; then
  echo "minikube not found"
  echo ""
  echo "KubeVision AI uses Minikube for local image loading and deployment."
  echo "Install it with one of these commands, then rerun this script:"
  echo "  brew install minikube"
  echo "  # or"
  echo "  curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-darwin-arm64"
  echo "  sudo install minikube-darwin-arm64 /usr/local/bin/minikube"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running or not healthy"
  echo ""
  echo "Minikube is installed, but this setup expects a healthy Docker driver."
  echo "Start Docker Desktop, wait for it to finish initializing, then rerun this script."
  echo "If you prefer a different driver, set it first with:"
  echo "  minikube config set driver docker"
  echo "or choose an installed driver such as docker, hyperkit, virtualbox, or qemu2."
  exit 1
fi

# Check if Minikube is running
MINIKUBE_CPUS="${MINIKUBE_CPUS:-2}"
MINIKUBE_MEMORY="${MINIKUBE_MEMORY:-3072}"
MINIKUBE_DISK_SIZE="${MINIKUBE_DISK_SIZE:-15GB}"

if ! minikube status >/dev/null 2>&1; then
  echo "📦 Starting Minikube..."
  echo "   using ${MINIKUBE_CPUS} CPUs, ${MINIKUBE_MEMORY}MB memory, ${MINIKUBE_DISK_SIZE} disk"
  minikube start --cpus="${MINIKUBE_CPUS}" --memory="${MINIKUBE_MEMORY}" --disk-size="${MINIKUBE_DISK_SIZE}"
fi

# Set Docker environment to use Minikube's Docker daemon
echo "📦 Configuring Docker..."
eval $(minikube docker-env)

# Build workload images
echo "🐳 Building workload images..."
cd workloads
for service in student-portal attendance-service result-service notification-service; do
  if [ -d "$service" ]; then
    echo "  Building $service..."
    docker build -t $service $service/
  fi
done
cd ..

# Create namespaces
echo "🔧 Creating Kubernetes namespaces..."
kubectl apply -f k8s/namespaces.yaml

# Apply RBAC
echo "🔐 Setting up RBAC..."
kubectl apply -f k8s/rbac.yaml

# Apply database service
echo "💾 Setting up database..."
kubectl apply -f k8s/university-data/postgres.yaml

# Apply workload deployments
echo "🚀 Deploying workloads..."
kubectl apply -f k8s/university-frontend/
kubectl apply -f k8s/university-backend/
kubectl apply -f k8s/university-data/

# Wait for deployments to be ready
echo "⏳ Waiting for deployments..."
kubectl wait --for=condition=available --timeout=300s deployment -l app -A || true

# Start Prometheus Port Forward
echo "📈 Forwarding Prometheus port 9090..."
PROM_PID=""
if lsof -tiTCP:9090 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  Prometheus port 9090 already in use; reusing existing forward."
else
  # Try both common service names for Prometheus
  if kubectl get svc -n monitoring kube-prom-kube-prometheus-prometheus >/dev/null 2>&1; then
    kubectl port-forward -n monitoring svc/kube-prom-kube-prometheus-prometheus 9090:9090 >/dev/null 2>&1 &
    PROM_PID=$!
  elif kubectl get svc -n monitoring prometheus >/dev/null 2>&1; then
    kubectl port-forward -n monitoring svc/prometheus 9090:9090 >/dev/null 2>&1 &
    PROM_PID=$!
  fi
  echo "  Prometheus forwarded."
fi

# Start backend
echo "🔵 Starting backend (FastAPI)..."
cd backend
pip install -q -r requirements.txt
export PYTHONUNBUFFERED=1
BACKEND_PID=""
if lsof -tiTCP:8000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  Backend already listening on port 8000; reusing existing process."
else
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
  BACKEND_PID=$!
  echo "  Backend PID: $BACKEND_PID"
fi
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "🟢 Starting frontend (React)..."
cd frontend
if [ ! -x node_modules/.bin/vite ]; then
  echo "  Installing frontend dependencies..."
  if ! npm install; then
    echo "Frontend dependency installation failed. Run 'cd frontend && npm install' and retry."
    exit 1
  fi
fi
FRONTEND_PID=""
if lsof -tiTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  Frontend already listening on port 3000; reusing existing process."
else
  npm run start -- --host 0.0.0.0 &
  FRONTEND_PID=$!
  echo "  Frontend PID: $FRONTEND_PID"
fi
cd ..

# Print URLs
echo ""
echo "✅ KubeVision AI Started!"
echo "================================"
echo "Dashboard:   http://localhost:3000"
echo "Backend:     http://localhost:8000"
echo "API Docs:    http://localhost:8000/docs"
echo ""
echo "Services:"
kubectl get svc -A | grep -v kube | head -10
echo ""
echo "To stop, press Ctrl+C"
echo "Pods are in namespaces: university-frontend, university-backend, university-data"
echo ""

# Wait for Ctrl+C
trap '[[ -n "$BACKEND_PID" ]] && kill "$BACKEND_PID" 2>/dev/null; [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null; [[ -n "$PROM_PID" ]] && kill "$PROM_PID" 2>/dev/null; exit' INT TERM
if [[ -z "$BACKEND_PID" && -z "$FRONTEND_PID" ]]; then
  echo ""
  echo "Reusing existing backend/frontend processes; this terminal will stay attached until Ctrl+C."
  while true; do
    sleep 3600
  done
else
  wait
fi
