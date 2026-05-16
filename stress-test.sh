#!/bin/bash
# CPU Stress Test for KubeVision Demo
# This script generates REAL CPU load that Prometheus will detect

echo "🔥 Starting CPU Stress Test..."
echo "Target: student-portal pod"
echo "Duration: 120 seconds"
echo ""

# Get the pod name
POD=$(kubectl get pods -n university-frontend -l app=student-portal -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo "❌ Error: student-portal pod not found"
  exit 1
fi

echo "✓ Found pod: $POD"
echo ""

# Execute CPU burn inside the pod
echo "🔥 Burning CPU for 120 seconds..."
kubectl exec -n university-frontend $POD -- sh -c '
  echo "Starting CPU burn..."
  end_time=$(($(date +%s) + 120))
  while [ $(date +%s) -lt $end_time ]; do
    for i in $(seq 1 1000000); do
      echo "scale=5000; 4*a(1)" | bc -l > /dev/null 2>&1
    done
  done
  echo "CPU burn complete"
' &

STRESS_PID=$!

echo "✓ Stress test running in background (PID: $STRESS_PID)"
echo ""
echo "📊 Monitor in real-time:"
echo "   Dashboard: http://localhost:3000"
echo "   Prometheus: http://localhost:9090"
echo ""
echo "⏱️  Wait 30-60 seconds for Prometheus to scrape metrics..."
echo "   Then check your dashboard for CPU spike detection!"
echo ""
echo "Press Ctrl+C to stop early, or wait 120s for auto-completion"

wait $STRESS_PID
echo ""
echo "✅ Stress test completed!"
