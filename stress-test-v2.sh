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

# Execute CPU burn inside the pod using Python
echo "🔥 Burning CPU for 120 seconds..."
kubectl exec -n university-frontend $POD -- python3 -c '
import time
import hashlib

print("Starting CPU burn...", flush=True)
start_time = time.time()
end_time = start_time + 120
iteration = 0

while time.time() < end_time:
    # VERY intensive CPU operations
    for _ in range(100000):
        # Hash calculations (CPU intensive)
        data = str(iteration).encode()
        for __ in range(100):
            hashlib.sha256(data).hexdigest()
        # Math operations
        result = sum(i**2 for i in range(1000))
        iteration += 1
    
    # Print progress
    elapsed = int(time.time() - start_time)
    remaining = int(end_time - time.time())
    if elapsed % 10 == 0:
        print(f"[{elapsed}s] Still burning... {remaining}s remaining (iteration {iteration})", flush=True)

print(f"CPU burn complete! Total iterations: {iteration}", flush=True)
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
