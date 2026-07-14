import React, { useState, useEffect } from "react";
import { BarChart3, AlertCircle, RefreshCw, FileText, CheckCircle2, TrendingUp, User, Percent } from "lucide-react";
import { DEPT_STYLES } from "./desk-tab";

interface Breakdown {
  officer_name: string;
  count: number;
}

interface Trend {
  date: string;
  critical_count: number;
  watch_count: number;
}

interface LatestItem {
  headline: string;
  department: string;
  date: string;
}

interface StatsData {
  total_items_month: number;
  urgent_required: number;
  under_monitoring: number;
  resolved_month: number;
  resolved_percentage: number;
  marked_to_officer_breakdown: Breakdown[];
  urgency_trend_month: Trend[];
  latest_marked_news: LatestItem[];
}

export default function OverviewTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/overview-stats`);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-primaryBlue rounded-full animate-spin" />
        <p className="text-sm text-textSecondary">Loading Executive Overview...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-cardBg border border-borderSlate rounded-2xl space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <div>
          <h3 className="text-lg font-bold text-textPrimary">Failed to Load Overview</h3>
          <p className="text-sm text-textSecondary mt-1">Please ensure the FastAPI backend is running.</p>
        </div>
        <button onClick={fetchStats} className="bg-primaryBlue text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Find max value in breakdown to scale horizontal bars
  const maxMarkedCount = stats.marked_to_officer_breakdown.length > 0 
    ? Math.max(...stats.marked_to_officer_breakdown.map(x => x.count)) 
    : 1;

  // Custom SVG Line Chart coordinates calculation helper
  const drawUrgencyChart = () => {
    const trend = stats.urgency_trend_month;
    if (!trend || trend.length === 0) return null;

    const width = 500;
    const height = 180;
    const paddingLeft = 35;
    const paddingRight = 15;
    const paddingTop = 15;
    const paddingBottom = 25;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Find max value in dataset to scale y-axis
    const maxVal = Math.max(
      ...trend.map(t => Math.max(t.critical_count, t.watch_count, 5)) // floor at 5 for nice scaling
    );

    const totalPoints = trend.length;
    const getX = (index: number) => paddingLeft + (index / (totalPoints - 1 || 1)) * chartW;
    const getY = (val: number) => height - paddingBottom - (val / maxVal) * chartH;

    // Generate path points
    let critPoints = "";
    let watchPoints = "";
    let critAreaPoints = `M ${getX(0)} ${height - paddingBottom} `;
    let watchAreaPoints = `M ${getX(0)} ${height - paddingBottom} `;

    trend.forEach((t, i) => {
      const cx = getX(i);
      const cyCrit = getY(t.critical_count);
      const cyWatch = getY(t.watch_count);

      if (i === 0) {
        critPoints += `M ${cx} ${cyCrit} `;
        watchPoints += `M ${cx} ${cyWatch} `;
      } else {
        // Curve approximation (smooth bezier curve relative coordinate helper)
        const prevX = getX(i - 1);
        const cpX1 = prevX + (cx - prevX) / 2;
        const cpX2 = cx - (cx - prevX) / 2;
        
        const cyCritPrev = getY(trend[i - 1].critical_count);
        const cyWatchPrev = getY(trend[i - 1].watch_count);

        critPoints += `C ${cpX1} ${cyCritPrev}, ${cpX2} ${cyCrit}, ${cx} ${cyCrit} `;
        watchPoints += `C ${cpX1} ${cyWatchPrev}, ${cpX2} ${cyWatch}, ${cx} ${cyWatch} `;
      }

      critAreaPoints += `L ${cx} ${cyCrit} `;
      watchAreaPoints += `L ${cx} ${cyWatch} `;
    });

    critAreaPoints += `L ${getX(totalPoints - 1)} ${height - paddingBottom} Z`;
    watchAreaPoints += `L ${getX(totalPoints - 1)} ${height - paddingBottom} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        <defs>
          <linearGradient id="critGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0"/>
          </linearGradient>
          <linearGradient id="watchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#D97706" stopOpacity="0.0"/>
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {[0, 1, 2, 3, 4].map((grid, idx) => {
          const gridVal = (maxVal / 4) * idx;
          const gy = getY(gridVal);
          return (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={gy}
                x2={width - paddingRight}
                y2={gy}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={paddingLeft - 8}
                y={gy + 4}
                className="text-[9px] fill-textSecondary font-semibold text-right"
                textAnchor="end"
              >
                {Math.round(gridVal)}
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {trend.map((t, idx) => {
          // Render labels selectively if there are many days to avoid overlapping
          const shouldShowLabel = 
            trend.length <= 8 || 
            idx === 0 || 
            idx === trend.length - 1 || 
            (trend.length > 8 && idx % Math.ceil(trend.length / 5) === 0);

          if (!shouldShowLabel) return null;

          const labelDate = new Date(t.date);
          const labelFormatted = labelDate.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short"
          });
          const cx = getX(idx);
          return (
            <text
              key={idx}
              x={cx}
              y={height - 8}
              className="text-[8px] fill-textSecondary font-bold"
              textAnchor="middle"
            >
              {labelFormatted}
            </text>
          );
        })}

        {/* Area Fills */}
        <path d={critAreaPoints} fill="url(#critGrad)" />
        <path d={watchAreaPoints} fill="url(#watchGrad)" />

        {/* Curves */}
        <path d={critPoints} fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" />
        <path d={watchPoints} fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />

        {/* Data Circles */}
        {trend.map((t, idx) => {
          const cx = getX(idx);
          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={getY(t.critical_count)}
                r="3.5"
                fill="#FFFFFF"
                stroke="#DC2626"
                strokeWidth="2"
              />
              <circle
                cx={cx}
                cy={getY(t.watch_count)}
                r="3.5"
                fill="#FFFFFF"
                stroke="#D97706"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black text-[#0A2540]">Executive Overview</h2>
          <p className="text-xs text-slate-500">Aggregate media intelligence report for the current calendar month</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center space-x-1.5 self-start sm:self-auto bg-[#0A2540] hover:bg-slate-850 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Report</span>
        </button>
      </div>

      {/* Aggregate Stat cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Items */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-[#0A2540] p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Items (Month)</p>
            <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.total_items_month}</h3>
            <p className="text-[9px] text-slate-400 font-medium">Volume segmented this month</p>
          </div>
          <div className="w-11 h-11 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-[#0A2540]">
            <FileText className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Card 2: Urgent Action Required (Red accent top border) */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-red-600 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Urgent Action</p>
            <h3 className="text-3xl font-black text-red-600 leading-none">{stats.urgent_required}</h3>
            <p className="text-[9px] text-red-500 font-semibold">Active Critical/High items</p>
          </div>
          <div className="w-11 h-11 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center text-red-600">
            <AlertCircle className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Card 3: Under Monitoring (Amber accent top border) */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-amber-500 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Under Monitoring</p>
            <h3 className="text-3xl font-black text-slate-800 leading-none">{stats.under_monitoring}</h3>
            <p className="text-[9px] text-slate-400 font-medium">Items assigned and active</p>
          </div>
          <div className="w-11 h-11 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600">
            <TrendingUp className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Card 4: Resolved (Green accent top border) */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-emerald-600 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Resolved Items (Month)</p>
            <h3 className="text-3xl font-black text-emerald-600 leading-none">{stats.resolved_month}</h3>
            <p className="text-[9px] text-emerald-650 font-semibold">Successfully resolved</p>
          </div>
          <div className="w-11 h-11 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Card 5: Resolution Percentage (Indigo/Violet accent top border) */}
        <div className="bg-white border border-slate-200 border-t-4 border-t-indigo-600 p-5 rounded-xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">% Cases Solved</p>
            <h3 className="text-3xl font-black text-indigo-600 leading-none">{stats.resolved_percentage}%</h3>
            <p className="text-[9px] text-indigo-500 font-semibold">Of month's cases solved</p>
          </div>
          <div className="w-11 h-11 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
            <Percent className="w-5.5 h-5.5 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Two column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Total Marked to Officer */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col justify-between min-h-[300px]">
          <div className="space-y-1 mb-4 border-l-2 border-amber-500 pl-3">
            <h4 className="text-sm font-black text-[#0A2540]">Total Marked to Officer</h4>
            <p className="text-[10px] text-slate-500">Cumulative load distributions across officers</p>
          </div>

          {stats.marked_to_officer_breakdown.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              No data available for today
            </div>
          ) : (
            <div className="flex-1 space-y-3.5 overflow-y-auto max-h-64 pr-2">
              {stats.marked_to_officer_breakdown.map((off, index) => {
                const widthPercent = Math.max(12, Math.round((off.count / maxMarkedCount) * 100));
                return (
                  <div key={index} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-800 flex items-center">
                        <User className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                        {off.officer_name}
                      </span>
                      <span className="text-[#0A2540] font-bold">{off.count} items</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${widthPercent}%` }}
                        className="bg-[#0A2540] h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Urgency Trends */}
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col justify-between min-h-[300px]">
          <div className="flex justify-between items-start mb-4">
            <div className="space-y-1 border-l-2 border-amber-500 pl-3">
              <h4 className="text-sm font-black text-[#0A2540]">Urgency Trends</h4>
              <p className="text-[10px] text-slate-500">High and Medium severity items daily volume</p>
            </div>
            
            {/* Chart Legend */}
            <div className="flex items-center space-x-3 text-[10px] font-bold">
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-650 inline-block" />
                <span className="text-slate-500">Critical</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-slate-500">Watch</span>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            {drawUrgencyChart()}
          </div>
        </div>
      </div>

      {/* Latest Marked News */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div className="space-y-1 mb-4 border-b border-slate-100 pb-3 border-l-2 border-amber-500 pl-3">
          <h4 className="text-sm font-black text-[#0A2540]">Latest Marked News (Current Month)</h4>
          <p className="text-[10px] text-slate-500">Recently dispatched media intelligence reports this month</p>
        </div>

        {stats.latest_marked_news.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-405">
            No marked articles in the current month
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-2">
            {stats.latest_marked_news.map((item, index) => {
              // Parse date formatted
              const labelDate = new Date(item.date);
              const labelFormatted = labelDate.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric"
              });

              return (
                <div key={index} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs hover:bg-slate-50/50 transition-colors px-1">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-850 leading-snug">{item.headline}</p>
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${DEPT_STYLES[item.department] || "bg-slate-100 text-slate-600"}`}>
                      {item.department}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap shrink-0">{labelFormatted}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
