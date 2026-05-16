#!/bin/bash
# CPU Stress Test - Optimized to avoid OOMKill

echo "🔥 Starting CPU Stress Test (OOMKill-safe)..."
echo "Target: student-portal pod"
echo "Duration: 120 seconds"
echo ""

POD=$(kubectl get pods -n university-frontend -l app=student-portal -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD" ]; then
  echo "❌ Error: student-portal pod not found"
  exit 1
fi

echo "✓ Found pod: $POD"
echo ""
echo "🔥 Spawning 2 CPU burners (to avoid memory limits)..."

# Only 2 processes to stay within 256Mi memory limit
for i in {1..2}; do
  kubectl exec -n university-frontend $POD -- python3 -c "
import time
end = time.time() + 120
count = 0
while time.time() < end:
    # Tight loop
    for _ in range(10000000):
        count += 1
" &
  echo "  ✓ Started burner $i"
done

echo ""
echo "✅ CPU burners running!"
echo ""
echo "📊 Monitor your dashboard"
echo "⏱️  Running for 120 seconds..."

wait

echo ""
echo "✅ Completed!"
