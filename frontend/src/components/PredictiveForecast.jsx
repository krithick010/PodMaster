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
    return <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 animate-pulse h-80 shadow-2xl"></div>;
  }

  const currentData = tab === "cpu" ? forecast?.cpu_forecast : forecast?.memory_forecast;
  const isWarmingUp = !currentData || !currentData.historical || currentData.historical.length < 2;

  if (isWarmingUp) {
    return (
      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 shadow-2xl h-full flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-4 relative z-10">
          <div>
            <h3 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em]">Predictive Projection</h3>
            <p className="text-[9px] font-mono text-gray-500 mt-1 uppercase">EWMA + Polynomial Regression Engine</p>
          </div>
          <div className="flex bg-[#161b22] rounded-lg p-1 border border-[#30363d]">
            <button onClick={() => setTab("cpu")} className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${tab === "cpu" ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500'}`}>CPU</button>
            <button onClick={() => setTab("memory")} className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-colors ${tab === "memory" ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500'}`}>MEM</button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center relative z-10">
          <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.3)]" />
          <div className="space-y-1">
            <div className="text-xs font-mono font-black text-gray-200 uppercase tracking-widest">Calibrating Engine...</div>
            <div className="text-[10px] font-mono text-gray-500">Accumulating telemetry for <span className="text-cyan-400">{podName}</span></div>
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
      fontFamily: 'monospace',
      toolbar: { show: false },
      background: 'transparent',
      animations: {
        enabled: true,
        easing: 'linear',
        speed: 800,
      }
    },
    colors: tab === "cpu" ? ['#06b6d4', '#ef4444'] : ['#a78bfa', '#f59e0b'],
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
        style: { colors: '#484f58', fontSize: '9px', fontFamily: 'monospace' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        style: { colors: '#484f58', fontSize: '9px', fontFamily: 'monospace' },
        formatter: (val) => tab === "cpu" ? `${val.toFixed(1)}%` : `${(val / (1024*1024)).toFixed(0)}MB`
      }
    },
    grid: { borderColor: '#30363d', strokeDashArray: 3 },
    theme: { mode: 'dark' },
    tooltip: { theme: 'dark', x: { show: false } },
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
    <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 shadow-2xl h-full flex flex-col relative overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
            Predictive Projection
            {hasLeak && (
              <span className="flex items-center gap-1 bg-red-500/10 text-red-500 px-2 py-0.5 rounded border border-red-500/30 text-[8px] animate-pulse">
                <AlertTriangle size={10} /> CRITICAL TREND
              </span>
            )}
          </h3>
          <p className="text-[9px] font-mono text-gray-500 mt-1 uppercase">Autoregressive Trend Analysis</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#161b22] rounded-lg p-1 border border-[#30363d]">
          <button 
            onClick={() => setTab("cpu")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-all ${tab === "cpu" ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            CPU
          </button>
          <button 
            onClick={() => setTab("memory")}
            className={`px-3 py-1 text-[10px] font-mono font-bold rounded transition-all ${tab === "memory" ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            MEM
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[160px] -ml-2 relative z-10">
        <ReactApexChart options={chartOptions} series={series} type="area" height="100%" />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#30363d] relative z-10">
        <div className="flex items-center gap-4">
            <div className="flex flex-col">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Current</span>
                <span className="text-xs font-mono font-black text-gray-200">
                    {tab === "cpu" ? currentData.historical[histLen - 1]?.toFixed(1) + '%' : (currentData.historical[histLen - 1] / (1024*1024))?.toFixed(0) + 'MB'}
                </span>
            </div>
            <div className="flex flex-col border-l border-[#30363d] pl-4">
                <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Confidence</span>
                <span className="text-xs font-mono font-black text-cyan-500">{(currentData.confidence * 100).toFixed(0)}%</span>
            </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border border-[#30363d] rounded text-[10px] font-mono">
          <span className="text-gray-500">TREND:</span>
          {currentData.trend === "up" ? (
            <span className="text-red-500 flex items-center gap-1 font-bold"><TrendingUp size={12} /> INCREASING</span>
          ) : currentData.trend === "down" ? (
            <span className="text-emerald-500 flex items-center gap-1 font-bold"><TrendingDown size={12} /> DECREASING</span>
          ) : (
            <span className="text-gray-400 font-bold">STABLE</span>
          )}
        </div>
      </div>

      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
    </div>
  );
}
