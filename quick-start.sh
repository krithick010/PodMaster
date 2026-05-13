#!/bin/bash

set -e

echo "🚀 KubeVision AI - Quick Start"
echo "=============================="

# Check prerequisites
echo "✓ Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "Docker not found"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found"; exit 1; }
command -v minikube >/dev/null 2>&1 || { echo "minikube not found"; exit 1; }

# Check if Minikube is running
if ! minikube status >/dev/null 2>&1; then
  echo "📦 Starting Minikube..."
  minikube start --cpus=4 --memory=4096 --disk-size=20GB
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

# Start backend
echo "🔵 Starting backend (FastAPI)..."
cd backend
pip install -q -r requirements.txt
export PYTHONUNBUFFERED=1
python main.py &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "🟢 Starting frontend (React)..."
cd frontend
npm install -q 2>/dev/null || true
npm start &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"
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
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM
wait
