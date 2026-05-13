"""
Prompt templates for LLM insight generation.
Provides both Ollama prompts and fallback templates.
"""

# Templates for Ollama LLM generation
# Format strings: {pod_name}, {namespace}, {description}, {metrics_json}

ANOMALY_TEMPLATES = {
    "CPU_CRITICAL": """You are a Kubernetes expert. A pod has critical CPU usage.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Provide a concise, actionable insight in 1-2 sentences. Focus on:
1. What causes this issue
2. Immediate action to take
3. Long-term fix""",

    "CPU_HIGH": """You are a Kubernetes expert. A pod has elevated CPU usage.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Provide a brief insight (1 sentence) about the CPU usage and suggest scaling or optimization.""",

    "MEMORY_CRITICAL": """You are a Kubernetes expert. A pod has critical memory usage.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Provide a concise insight in 1-2 sentences covering:
1. Likely cause (memory leak, large data load, etc.)
2. Recommended action (restart, increase limit, or code fix)""",

    "MEMORY_HIGH": """You are a Kubernetes expert. A pod has elevated memory usage.
Pod: {pod_name} in namespace {namespace}
Issue: {description}

Suggest optimization strategies in 1 sentence.""",

    "NETWORK_CRITICAL_IN": """You are a Kubernetes expert. A pod has a critical inbound network spike.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Analyze in 1-2 sentences: What could cause this spike? Is it expected or an anomaly?""",

    "NETWORK_HIGH_IN": """You are a Kubernetes expert. A pod has elevated inbound traffic.
Pod: {pod_name} in namespace {namespace}
Issue: {description}

Brief insight in 1 sentence.""",

    "NETWORK_CRITICAL_OUT": """You are a Kubernetes expert. A pod has a critical outbound network spike.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Analyze: What could cause this? Suggest investigation steps.""",

    "NETWORK_HIGH_OUT": """You are a Kubernetes expert. A pod has elevated outbound traffic.
Pod: {pod_name} in namespace {namespace}
Issue: {description}

Brief analysis in 1 sentence.""",

    "STORAGE_CRITICAL": """You are a Kubernetes expert. A PVC is critically full.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Provide urgent action items in 1-2 sentences.""",

    "STORAGE_PRESSURE": """You are a Kubernetes expert. A PVC is running low on space.
Pod: {pod_name} in namespace {namespace}
Issue: {description}

Suggest preventive actions in 1 sentence.""",

    "PVC_RESTART_CORRELATION": """You are a Kubernetes expert. A pod is crashing due to storage I/O stress.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Explain the correlation and suggest fixes in 2 sentences.""",

    "LOG_ERROR_SPIKE": """You are a Kubernetes expert. A pod's logs show an error spike.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Analyze: What could trigger this error spike? Suggest debugging steps.""",

    "LOG_ERROR_ELEVATED": """You are a Kubernetes expert. A pod has elevated log errors.
Pod: {pod_name} in namespace {namespace}
Issue: {description}

Brief insight in 1 sentence.""",

    "POD_PENDING_TIMEOUT": """You are a Kubernetes expert. A pod has been stuck in Pending state.
Pod: {pod_name} in namespace {namespace}
Issue: {description}
Metrics: {metrics_json}

Diagnose: What could prevent scheduling? Suggest fixes.""",

    "POD_FAILED": """You are a Kubernetes expert. A pod has failed.
Pod: {pod_name} in namespace {namespace}
Issue: {description}

Brief diagnostic in 1 sentence.""",

    "GENERIC": """You are a Kubernetes expert. A pod anomaly was detected.
Pod: {pod_name} in namespace {namespace}
Type: {anomaly_type}
Issue: {description}
Metrics: {metrics_json}

Provide a concise insight and recommended action.""",
}

# Fallback templates when Ollama is not available
# Format strings: {pod_name}, {namespace}, {description}

FALLBACK_TEMPLATES = {
    "CPU_CRITICAL": (
        "🔴 CRITICAL CPU: {pod_name} in {namespace} is using excessive CPU. "
        "Consider horizontal scaling, vertical scaling, or optimizing the application logic. "
        "Check if there's a tight loop or inefficient algorithm consuming cycles."
    ),

    "CPU_HIGH": (
        "🟡 HIGH CPU: {pod_name} is nearing its CPU limit. "
        "Monitor the next few minutes—if it remains high, increase the CPU limit or optimize the workload."
    ),

    "MEMORY_CRITICAL": (
        "🔴 CRITICAL MEMORY: {pod_name} in {namespace} is running out of memory. "
        "Either increase the memory limit or investigate for memory leaks (check for unbounded data structures). "
        "Restart may be needed if a leak is suspected."
    ),

    "MEMORY_HIGH": (
        "🟡 HIGH MEMORY: {pod_name} is using significant memory. "
        "This may be normal for the workload, but monitor for sustained high usage (potential memory leak)."
    ),

    "NETWORK_CRITICAL_IN": (
        "🔴 CRITICAL INBOUND TRAFFIC: {pod_name} is receiving a massive amount of data. "
        "Check if this is expected (e.g., bulk data import) or if there's an attack/misconfiguration."
    ),

    "NETWORK_HIGH_IN": (
        "🟡 HIGH INBOUND TRAFFIC: {pod_name} is receiving elevated network traffic. "
        "Verify this is expected behavior for your application."
    ),

    "NETWORK_CRITICAL_OUT": (
        "🔴 CRITICAL OUTBOUND TRAFFIC: {pod_name} is sending massive amounts of data. "
        "Check for data exfiltration, misconfigured logging, or large batch operations."
    ),

    "NETWORK_HIGH_OUT": (
        "🟡 HIGH OUTBOUND TRAFFIC: {pod_name} is sending elevated network traffic. "
        "This may indicate increased external API calls or data synchronization."
    ),

    "STORAGE_CRITICAL": (
        "🔴 CRITICAL STORAGE: PVC for {pod_name} in {namespace} is critically full (>90%). "
        "Immediate action needed: increase PVC size, delete old data, or investigate runaway writes."
    ),

    "STORAGE_PRESSURE": (
        "🟡 STORAGE PRESSURE: PVC for {pod_name} is 80%+ full. "
        "Plan to increase storage capacity or clean up old data soon."
    ),

    "PVC_RESTART_CORRELATION": (
        "🔴 STORAGE-INDUCED CRASHES: {pod_name} is crashing due to storage I/O stress (high PVC usage + frequent restarts). "
        "Expand the PVC and optimize I/O patterns in the application."
    ),

    "LOG_ERROR_SPIKE": (
        "🔴 ERROR SPIKE: {pod_name} is logging errors at an elevated rate. "
        "Examine the logs for patterns. This could indicate a bug, external service failure, or misconfiguration."
    ),

    "LOG_ERROR_ELEVATED": (
        "🟡 ELEVATED ERRORS: {pod_name} has more errors than normal. "
        "Check application logs for recurring issues or environmental problems."
    ),

    "LOG_WARNINGS_ELEVATED": (
        "🟡 ELEVATED WARNINGS: {pod_name} is generating warnings. "
        "While not critical, these should be investigated to prevent future escalation."
    ),

    "POD_PENDING_TIMEOUT": (
        "🔴 POD STUCK PENDING: {pod_name} in {namespace} cannot be scheduled (stuck > 2 minutes). "
        "Common causes: insufficient resources, node affinity mismatch, or tainted nodes. "
        "Check 'kubectl describe pod' for details."
    ),

    "POD_FAILED": (
        "🔴 POD FAILED: {pod_name} in {namespace} exited abnormally. "
        "Review pod logs and events for the root cause."
    ),

    "NODE_PRESSURE": (
        "🟡 NODE PRESSURE: A node is under memory or disk pressure, which prevents pod scheduling. "
        "Add more nodes or free up resources on existing nodes."
    ),

    "GENERIC": (
        "⚠️ ANOMALY DETECTED in {pod_name} ({namespace}): {description}. "
        "Review metrics and logs for more context. "
        "Consult Kubernetes documentation if unsure about next steps."
    ),
}
