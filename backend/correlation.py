"""
Correlation module for KubeVision AI.
Detects correlations between metrics across pods and services.
"""

import numpy as np
import warnings
from typing import Any, Dict, List, Tuple


class MetricCorrelationAnalyzer:
    """
    Analyzes correlations between pod metrics to detect dependencies and root causes.
    """

    @staticmethod
    def calculate_correlation_matrix(
        pod_metrics: Dict[str, List[float]],
    ) -> Tuple[Dict[str, Dict[str, float]], List[Tuple[str, str, float]]]:
        """
        Calculate correlation matrix between pods.

        Args:
            pod_metrics: Dict of {pod_name: [metric_values]}

        Returns:
            Tuple of (correlation_matrix_dict, top_correlations_list)
        """
        if len(pod_metrics) < 2:
            return ({}, [])

        # Convert to numpy arrays
        pod_names = list(pod_metrics.keys())
        metric_arrays = []

        for pod_name in pod_names:
            values = pod_metrics[pod_name]
            if isinstance(values, list) and len(values) > 1:
                arr = np.array(values, dtype=float)
                # Handle NaN and inf
                arr = np.nan_to_num(arr, nan=0.0, posinf=1.0, neginf=-1.0)
                metric_arrays.append(arr)
            else:
                metric_arrays.append(np.array([0.0]))

        if len(metric_arrays) < 2:
            return ({}, [])

        # Ensure all arrays have same length
        min_len = min(len(arr) for arr in metric_arrays)
        metric_arrays = [arr[:min_len] for arr in metric_arrays]

        # Calculate correlation matrix
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                corr_matrix = np.corrcoef(metric_arrays)
                corr_matrix = np.nan_to_num(corr_matrix, nan=0.0)
        except Exception as e:
            print(f"Error calculating correlation: {e}")
            return ({}, [])

        # Convert to dict
        corr_dict = {}
        for i, pod1 in enumerate(pod_names):
            corr_dict[pod1] = {}
            for j, pod2 in enumerate(pod_names):
                if i != j:
                    corr_dict[pod1][pod2] = float(corr_matrix[i, j])

        # Extract top correlations (abs value > 0.7)
        top_correlations = []
        for i, pod1 in enumerate(pod_names):
            for j, pod2 in enumerate(pod_names):
                if i < j:  # Avoid duplicates
                    corr = corr_matrix[i, j]
                    if abs(corr) > 0.7:
                        top_correlations.append((pod1, pod2, float(corr)))

        # Sort by absolute correlation
        top_correlations.sort(key=lambda x: abs(x[2]), reverse=True)

        return (corr_dict, top_correlations)

    @staticmethod
    def detect_cascading_failure(
        anomalies: List[Dict[str, Any]],
        dependency_graph: Dict[str, List[str]],
    ) -> List[Tuple[str, str, str]]:
        """
        Detect cascading failures where one pod's issue triggers failures in dependent pods.

        Args:
            anomalies: List of current anomalies
            dependency_graph: Dict of {pod_name: [dependent_pod_names]}

        Returns:
            List of cascading patterns as (source_pod, target_pod, failure_type)
        """
        cascading_patterns = []

        # For each anomaly, check if it's in a source pod
        for anomaly in anomalies:
            source_pod = anomaly.get("pod_name", "")
            anomaly_type = anomaly.get("anomaly_type", "")

            # Check if source pod has dependents
            if source_pod in dependency_graph:
                dependents = dependency_graph[source_pod]
                for target_pod in dependents:
                    # Check if target pod also has anomalies
                    target_anomalies = [a for a in anomalies if a.get("pod_name") == target_pod]
                    if target_anomalies:
                        cascading_patterns.append(
                            (source_pod, target_pod, anomaly_type)
                        )

        return cascading_patterns

    @staticmethod
    def find_root_cause_pod(
        anomalies: List[Dict[str, Any]],
        correlations: List[Tuple[str, str, float]],
    ) -> str:
        """
        Identify the likely root cause pod based on anomalies and correlations.

        Args:
            anomalies: List of anomalies
            correlations: List of high correlations between pods

        Returns:
            Name of likely root cause pod (or empty string if unclear)
        """
        if not anomalies:
            return ""

        # Count how many anomalies each pod has
        pod_anomaly_count: Dict[str, int] = {}
        for anomaly in anomalies:
            pod_name = anomaly.get("pod_name", "")
            if pod_name:
                pod_anomaly_count[pod_name] = pod_anomaly_count.get(pod_name, 0) + 1

        # Pod with most anomalies and appearing in correlations is likely root cause
        candidate_pods = sorted(
            pod_anomaly_count.items(),
            key=lambda x: x[1],
            reverse=True
        )

        if candidate_pods:
            return candidate_pods[0][0]

        return ""
