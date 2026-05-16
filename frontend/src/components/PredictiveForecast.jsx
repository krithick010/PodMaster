import React, { useState, useEffect } from "react";
import ReactApexChart from "react-apexcharts";
import axios from "axios";
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Activity } from "lucide-react";

export function PredictiveForecast({ podName }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("cpu"); // "cpu" or "memory"

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/forecast?pod_name=${podName || "result-service-0"}`);
        setForecast(res.data);
      } catch (e) {
        console.error("Forecast fetch error", e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchForecast();
    const int = setInterval(fetchForecast, 15000);
    return () => clearInterval(int);
  }, [podName]);

  if (loading) {
    return <div className="bg-surface border border-subtle rounded-xl p-6 animate-pulse h-80 shadow-sm"></div>;
  }

  const currentData = tab === "cpu" ? forecast?.cpu_forecast : forecast?.memory_forecast;
  const isWarmingUp = !currentData || !currentData.historical || currentData.historical.length < 2;

  if (isWarmingUp) {
    return (
      <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm h-full flex flex-col relative overflow-hidden text-primary font-sans">
        <div className="flex justify-between items-center mb-4 relative z-10 font-sans">
          <div>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider font-sans">Predictive Projection</h3>
            <p className="text-[10px] font-mono text-muted mt-1 uppercase">EWMA + Polynomial Regression Engine</p>
          </div>
          <div className="flex bg-elevated rounded-lg p-1 border border-subtle shadow-2xs font-mono">
            <button onClick={() => setTab("cpu")} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${tab === "cpu" ? 'bg-accent-cyan/15 text-accent-cyan' : 'text-muted'}`}>CPU</button>
            <button onClick={() => setTab("memory")} className={`px-3 py-1 text-xs font-bold rounded transition-colors ${tab === "memory" ? 'bg-accent-violet/15 text-accent-violet' : 'text-muted'}`}>MEM</button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center relative z-10 font-mono">
          <div className="w-10 h-10 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin shadow-2xs" />
          <div className="space-y-1">
            <div className="text-xs font-black text-primary uppercase tracking-widest font-sans">Calibrating Engine...</div>
            <div className="text-xs text-muted font-mono">Accumulating telemetry for <span className="text-accent-cyan font-bold">{podName}</span></div>
          </div>
        </div>
        {/* Background Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
             style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>
    );
  }

  const hasLeak = currentData.trend === "up" && currentData.confidence > 0.8;

  const chartOptions = {
    chart: {
      type: 'area',
      height: 180,
      fontFamily: 'inherit',
      toolbar: { show: false },
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'linear',
        speed: 800,
      }
    },
    colors: tab === "cpu" ? ['#0284c7', '#ef4444'] : ['#6366f1', '#f59e0b'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2, dashArray: [0, 4] },
    xaxis: {
      type: 'numeric',
      labels: {
        formatter: (val) => `${val}m`,
        style: { colors: 'var(--text-muted)', fontSize: '10px', fontFamily: 'inherit' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: 'var(--text-muted)', fontSize: '10px', fontFamily: 'inherit' },
        formatter: (val) => tab === "cpu" ? `${val.toFixed(1)}%` : `${(val / (1024*1024)).toFixed(0)}MB`
      }
    },
    grid: { borderColor: 'var(--bg-border)', strokeDashArray: 3 },
    theme: { mode: 'light' },
    tooltip: { theme: 'light', x: { show: false } },
    legend: { show: false }
  };

  const histLen = currentData.historical.length;
  const histSeries = currentData.historical.map((val, i) => [i - histLen, val]);
  const predSeries = currentData.predicted.map((val, i) => [i, val]);
  
  if (histLen > 0) {
      predSeries.unshift([0, currentData.historical[histLen - 1]]);
  }

  const series = [
    { name: 'Historical', data: histSeries },
    { name: 'Predicted (15m)', data: predSeries }
  ];

  return (
    <div className="bg-surface border border-subtle rounded-xl p-6 shadow-sm h-full flex flex-col relative overflow-hidden text-primary font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10 font-sans">
        <div>
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2.5 font-sans">
            Predictive Projection
            {hasLeak && (
              <span className="flex items-center gap-1 bg-accent-red/10 text-accent-red px-2 py-0.5 rounded border border-accent-red/20 text-[10px] animate-pulse font-mono shadow-2xs">
                <AlertTriangle size={12} /> CRITICAL TREND
              </span>
            )}
          </h3>
          <p className="text-[10px] font-mono text-muted mt-1 uppercase">Autoregressive Trend Analysis</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-elevated rounded-lg p-1 border border-subtle font-mono shadow-2xs">
          <button 
            onClick={() => setTab("cpu")}
            className={`px-3 py-1 text-xs font-bold rounded transition-all ${tab === "cpu" ? 'bg-accent-cyan/15 text-accent-cyan' : 'text-muted hover:text-primary'}`}
          >
            CPU
          </button>
          <button 
            onClick={() => setTab("memory")}
            className={`px-3 py-1 text-xs font-bold rounded transition-all ${tab === "memory" ? 'bg-accent-violet/15 text-accent-violet' : 'text-muted hover:text-primary'}`}
          >
            MEM
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[170px] -ml-2 relative z-10">
        <ReactApexChart options={chartOptions} series={series} type="area" height="100%" />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-subtle relative z-10 font-mono">
        <div className="flex items-center gap-5">
            <div className="flex flex-col">
                <span className="text-[10px] text-muted uppercase font-sans font-medium">Current</span>
                <span className="text-sm font-black text-primary font-mono mt-0.5">
                    {tab === "cpu" ? currentData.historical[histLen - 1]?.toFixed(1) + '%' : (currentData.historical[histLen - 1] / (1024*1024))?.toFixed(0) + 'MB'}
                </span>
            </div>
            <div className="flex flex-col border-l border-subtle pl-5 font-mono">
                <span className="text-[10px] text-muted uppercase font-sans font-medium">Confidence</span>
                <span className="text-sm font-black text-accent-cyan mt-0.5">{(currentData.confidence * 100).toFixed(0)}%</span>
            </div>
        </div>
        <div className="flex items-center gap-2.5 px-3.5 py-2 bg-elevated border border-subtle rounded-lg text-xs font-mono shadow-2xs font-semibold">
          <span className="text-muted font-sans font-normal">TREND:</span>
          {currentData.trend === "up" ? (
            <span className="text-accent-red flex items-center gap-1.5 font-bold"><TrendingUp size={14} /> INCREASING</span>
          ) : currentData.trend === "down" ? (
            <span className="text-accent-emerald flex items-center gap-1.5 font-bold"><TrendingDown size={14} /> DECREASING</span>
          ) : (
            <span className="text-muted font-bold font-sans">STABLE</span>
          )}
        </div>
      </div>

      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
    </div>
  );
}
