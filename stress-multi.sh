#!/bin/bash
# Multi-Process CPU Stress Test
# Spawns multiple CPU-burning processes to max out CPU

echo "🔥 Starting AGGRESSIVE CPU Stress Test..."
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
echo "🔥 Spawning 4 parallel CPU burners..."

# Spawn 4 parallel CPU burners
for i in {1..4}; do
  kubectl exec -n university-frontend $POD -- python3 -c "
import time
end = time.time() + 120
count = 0
while time.time() < end:
    count += 1
    for _ in range(1000000):
        x = 2 ** 1000
print(f'Process $i done: {count} iterations')
" &
  echo "  ✓ Started burner $i"
done

echo ""
echo "✓ All 4 CPU burners running!"
echo ""
echo "📊 Monitor in real-time:"
echo "   Dashboard: http://localhost:3000"
echo ""
echo "⏱️  This will run for 120 seconds..."
echo "   Watch your dashboard - CPU should spike to 80%+!"
echo ""

# Wait for all background jobs
wait

echo ""
echo "✅ All CPU burners completed!"
