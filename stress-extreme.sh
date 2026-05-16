#!/bin/bash
# EXTREME CPU Stress Test for M2 MacBook
# Uses infinite tight loops to actually max out CPU

echo "🔥 Starting EXTREME CPU Stress Test..."
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
echo "🔥 Spawning 8 EXTREME CPU burners..."

# Spawn 8 parallel processes with INFINITE tight loops
for i in {1..8}; do
  kubectl exec -n university-frontend $POD -- python3 -c "
import time
end = time.time() + 120
while time.time() < end:
    # Infinite tight loop - no breaks!
    pass
" &
  echo "  ✓ Started extreme burner $i"
done

echo ""
echo "✅ All 8 CPU burners running with INFINITE LOOPS!"
echo ""
echo "📊 Monitor your dashboard - CPU should hit 80%+ now!"
echo ""
echo "⏱️  Running for 120 seconds..."

# Wait for all background jobs
wait

echo ""
echo "✅ All CPU burners completed!"
