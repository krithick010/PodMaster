#!/usr/bin/env pwsh

Write-Host "🚀 KubeVision AI - Quick Start (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "`n✓ Checking prerequisites..." -ForegroundColor Green
$required = @("docker", "kubectl", "minikube")
foreach ($cmd in $required) {
    $found = $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue)
    if (-not $found) {
        Write-Host "✗ $cmd not found in PATH" -ForegroundColor Red
        exit 1
    }
}

# Check if Minikube is running
Write-Host "`n📦 Checking Minikube..." -ForegroundColor Cyan
$minikubeStatus = minikube status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting Minikube..." -ForegroundColor Yellow
    minikube start --cpus=4 --memory=4096 --disk-size=20GB
}

# Set Docker environment to use Minikube's Docker daemon
Write-Host "`n📦 Configuring Docker..." -ForegroundColor Cyan
& minikube docker-env | Invoke-Expression

# Build workload images
Write-Host "`n🐳 Building workload images..." -ForegroundColor Cyan
$workloads = @("student-portal", "attendance-service", "result-service", "notification-service")
foreach ($service in $workloads) {
    $path = "workloads\$service"
    if (Test-Path $path) {
        Write-Host "  Building $service..." -ForegroundColor Yellow
        docker build -t $service "$path"
    }
}

# Create namespaces
Write-Host "`n🔧 Creating Kubernetes namespaces..." -ForegroundColor Cyan
kubectl apply -f k8s/namespaces.yaml

# Apply RBAC
Write-Host "`n🔐 Setting up RBAC..." -ForegroundColor Cyan
kubectl apply -f k8s/rbac.yaml

# Apply database service
Write-Host "`n💾 Setting up database..." -ForegroundColor Cyan
kubectl apply -f k8s/university-data/postgres.yaml

# Apply workload deployments
Write-Host "`n🚀 Deploying workloads..." -ForegroundColor Cyan
kubectl apply -f k8s/university-frontend/
kubectl apply -f k8s/university-backend/
kubectl apply -f k8s/university-data/

# Wait for deployments to be ready
Write-Host "`n⏳ Waiting for deployments..." -ForegroundColor Yellow
kubectl wait --for=condition=available --timeout=300s deployment -l app -A -ErrorAction SilentlyContinue

# Start backend
Write-Host "`n🔵 Starting backend (FastAPI)..." -ForegroundColor Cyan
Push-Location backend
python -m pip install -q -r requirements.txt
$env:PYTHONUNBUFFERED = 1
$backendProcess = Start-Process python -ArgumentList "main.py" -PassThru
Write-Host "  Backend PID: $($backendProcess.Id)" -ForegroundColor Green
Pop-Location

Start-Sleep -Seconds 3

# Start frontend
Write-Host "`n🟢 Starting frontend (React)..." -ForegroundColor Cyan
Push-Location frontend
npm install -q 2>&1 | Out-Null
$frontendProcess = Start-Process npm -ArgumentList "start" -PassThru
Write-Host "  Frontend PID: $($frontendProcess.Id)" -ForegroundColor Green
Pop-Location

# Print URLs and status
Write-Host "`n✅ KubeVision AI Started!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Dashboard:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:     http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs:    http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
kubectl get svc -A | Select-Object -Skip 1 | Select-Object -First 10
Write-Host ""
Write-Host "Press Ctrl+C to stop..." -ForegroundColor Yellow

# Wait for termination
$null = $host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host "`nStopping services..." -ForegroundColor Yellow
Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
Write-Host "Done!" -ForegroundColor Green
