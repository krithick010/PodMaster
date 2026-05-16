"""
Forecasting module for KubeVision AI.
Predicts resource trends using EWMA and polynomial fitting.
"""

import numpy as np
from typing import Any, Dict, List, Optional, Tuple


class ResourceForecaster:
    """
    Forecasts resource usage trends using:
    - EWMA (Exponential Weighted Moving Average) for smoothing
    - Polynomial fitting for trend detection
    """

    def __init__(self, alpha: float = 0.3):
        """
        Initialize forecaster.

        Args:
            alpha: EWMA smoothing factor (0-1, higher = more weight on recent values)
        """
        self.alpha = alpha

    def forecast_cpu(self, history: List[float], steps: int = 5) -> Dict[str, Any]:
        """
        Forecast CPU usage.

        Args:
            history: List of historical CPU usage values
            steps: Number of steps to forecast ahead

        Returns:
            Dict with forecast data and trend analysis
        """
        if len(history) < 2:
            return {
                "forecast": [],
                "trend": "insufficient_data",
                "current": history[-1] if history else 0,
            }

        # Smooth with EWMA
        smoothed = self._ewma(history)

        # Fit polynomial trend
        x = np.arange(len(smoothed))
        y = np.array(smoothed)

        try:
            # Try quadratic fit
            coeffs = np.polyfit(x, y, 2)
            poly = np.poly1d(coeffs)

            # Generate forecast
            future_x = np.arange(len(smoothed), len(smoothed) + steps)
            forecast = poly(future_x).tolist()

            # Determine trend
            if coeffs[0] > 0.001:  # positive quadratic term
                trend = "increasing"
            elif coeffs[0] < -0.001:
                trend = "decreasing"
            else:
                trend = "stable"

            return {
                "forecast": forecast,
                "trend": trend,
                "current": smoothed[-1],
                "history_smoothed": smoothed,
            }
        except Exception as e:
            print(f"Error forecasting CPU: {e}")
            return {
                "forecast": [],
                "trend": "error",
                "current": history[-1] if history else 0,
            }

    def forecast_memory(self, history: List[float], steps: int = 5) -> Dict[str, Any]:
        """
        Forecast memory usage.

        Args:
            history: List of historical memory usage values
            steps: Number of steps to forecast ahead

        Returns:
            Dict with forecast data and trend analysis
        """
        # Same as CPU for now, but could be customized for memory-specific patterns
        return self.forecast_cpu(history, steps)

    def detect_anomaly_threshold(self, history: List[float]) -> Tuple[float, float]:
        """
        Detect anomaly thresholds using statistical analysis.

        Args:
            history: List of historical values

        Returns:
            Tuple of (warning_threshold, critical_threshold)
        """
        if len(history) < 3:
            return (0.8, 0.95)

        arr = np.array(history)
        mean = np.mean(arr)
        std = np.std(arr)

        # Warning at mean + 1.5 * std
        # Critical at mean + 2.5 * std
        warning = mean + 1.5 * std
        critical = mean + 2.5 * std

        return (float(warning), float(critical))

    @staticmethod
    def _ewma(values: List[float], alpha: float = 0.3) -> List[float]:
        """
        Calculate Exponential Weighted Moving Average.

        Args:
            values: Input values
            alpha: Smoothing factor

        Returns:
            Smoothed values
        """
        if not values:
            return []

        smoothed = [values[0]]
        for i in range(1, len(values)):
            smoothed.append(alpha * values[i] + (1 - alpha) * smoothed[-1])

        return smoothed
