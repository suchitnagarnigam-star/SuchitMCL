"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, AlertCircle, RefreshCw, FileText, CheckCircle2, 
  TrendingUp, User, Percent, Building2, Flame, Calendar, Clock
} from "lucide-react";
import { DEPT_STYLES } from "./desk-tab";
import { formatPersonName } from "@/lib/formatters";

interface OfficerBreakdown {
  officer_name: string;
  short_code?: string;
  designation?: string;
  count: number;
  urgent_count?: number;
  monitoring_count?: number;
  resolved_count?: number;
}

interface DepartmentBreakdown {
  department: string;
  count: number;
  urgent_count?: number;
  monitoring_count?: number;
  resolved_count?: number;
}

interface Trend {
  date: string;
  critical_count: number;
  watch_count: number;
}

interface StatsData {
  scope?: string;
  selected_date?: string;
  date_from?: string;
  date_to?: string;
  total_items?: number;
  total_items_month: number;
  urgent_required: number;
  under_monitoring: number;
  resolved_count?: number;
  resolved_month: number;
  resolved_percentage: number;
  marked_to_officer_breakdown: OfficerBreakdown[];
  department_breakdown?: DepartmentBreakdown[];
  urgency_trend_month: Trend[];
}

// Department Bar Theme Colors
const DEPT_BAR_COLORS: Record<string, string> = {
  "Operations & Maintenance (O&M)": "bg-blue-600",
  "Bridges & Roads (B&R)": "bg-amber-600",
  "Horticulture / Parks & Squares": "bg-emerald-600",
  "Solid Waste Management (SWM)": "bg-orange-600",
  "Sanitation & Vector Control": "bg-teal-600",
  "Health Branch": "bg-red-600",
  "Town Planning (Building Branch)": "bg-indigo-600",
  "Tehbazari / Land & Encroachment": "bg-yellow-600",
  "Licensing & Health License Branch": "bg-cyan-600",
  "Property Tax / House Tax Branch": "bg-violet-600",
  "Accounts & Finance": "bg-lime-600",
  "Establishment & General Branch": "bg-pink-600",
  "Legal Cell": "bg-purple-600",
  "Public Grievance Redressal / IT Cell": "bg-sky-600",
  "Fire Brigade & Emergency Services": "bg-rose-600"
};

export default function OverviewTab() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeScope, setTimeScope] = useState<"today" | "month" | "all" | "date">("month");
  const [selectedDate, setSelectedDate] = useState<string>("");

  const fetchStats = async (scopeOverride?: "today" | "month" | "all" | "date", dateOverride?: string) => {
    setLoading(true);
    try {
      const activeScope = scopeOverride || timeScope;
      const activeDate = dateOverride !== undefined ? dateOverride : selectedDate;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      let url = `${apiUrl}/overview-stats?scope=${activeScope}`;
      if (activeScope === "date" && activeDate) {
        url = `${apiUrl}/overview-stats?date=${activeDate}`;
      } else if (activeScope === "today") {
        url = `${apiUrl}/overview-stats?scope=today`;
      }
      
      const res = await fetch(url);
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
    fetchStats(timeScope, selectedDate);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0A2540] rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-semibold">Loading Executive Overview...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-slate-400" />
        <div>
          <h3 className="text-lg font-bold text-slate-800">Failed to Load Overview</h3>
          <p className="text-sm text-slate-500 mt-1">Please ensure the FastAPI backend is running.</p>
        </div>
        <button onClick={() => fetchStats()} className="bg-[#0A2540] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center space-x-1 cursor-pointer">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  // Formatted date label for custom date selection
  const formattedDate = selectedDate ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }) : "";

  // Officer Breakdown Calculations
  const officerList = stats.marked_to_officer_breakdown || [];
  const maxOfficerCount = officerList.length > 0 
    ? Math.max(...officerList.map(x => x.count)) 
    : 1;
  const totalOfficerDispatches = officerList.reduce((acc, x) => acc + x.count, 0);
  const totalOfficerDispatchesForScale = totalOfficerDispatches || 1;

  // Department Breakdown Calculations
  const deptList = stats.department_breakdown || [];
  const maxDeptCount = deptList.length > 0 
    ? Math.max(...deptList.map(x => x.count)) 
    : 1;
  const totalDeptDispatches = deptList.reduce((acc, x) => acc + x.count, 0);
  const totalDeptDispatchesForScale = totalDeptDispatches || 1;

  // Custom SVG Line Chart coordinates calculation helper
  const drawUrgencyChart = () => {
    const trend = stats.urgency_trend_month;
    if (!trend || trend.length === 0) return null;

    const width = 700;
    const height = 130;
    const paddingLeft = 32;
    const paddingRight = 18;
    const paddingTop = 12;
    const paddingBottom = 22;

    const chartW = width - paddingLeft - paddingRight;
    const chartH = height - paddingTop - paddingBottom;

    // Find max value in dataset to scale y-axis
    const maxVal = Math.max(
      ...trend.map(t => Math.max(t.critical_count, t.watch_count, 5))
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
            <stop offset="0%" stopColor="#DC2626" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#DC2626" stopOpacity="0.0"/>
          </linearGradient>
          <linearGradient id="watchGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D97706" stopOpacity="0.25"/>
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
                strokeDasharray="3,3"
              />
              <text
                x={paddingLeft - 6}
                y={gy + 3}
                className="text-[8.5px] fill-slate-400 font-semibold text-right"
                textAnchor="end"
              >
                {Math.round(gridVal)}
              </text>
            </g>
          );
        })}

        {/* X Axis Labels */}
        {trend.map((t, idx) => {
          const shouldShowLabel = 
            trend.length <= 8 || 
            idx === 0 || 
            idx === trend.length - 1 || 
            (trend.length > 8 && idx % Math.ceil(trend.length / 6) === 0);

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
              y={height - 6}
              className="text-[8.5px] fill-slate-500 font-bold"
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
        <path d={critPoints} fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
        <path d={watchPoints} fill="none" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />

        {/* Data Circles */}
        {trend.map((t, idx) => {
          const cx = getX(idx);
          return (
            <g key={idx}>
              <circle
                cx={cx}
                cy={getY(t.critical_count)}
                r="3"
                fill="#FFFFFF"
                stroke="#DC2626"
                strokeWidth="1.8"
              />
              <circle
                cx={cx}
                cy={getY(t.watch_count)}
                r="3"
                fill="#FFFFFF"
                stroke="#D97706"
                strokeWidth="1.8"
              />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tab Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-black text-[#0A2540]">Executive Overview</h2>
            <span className="text-[9.5px] font-black bg-blue-100 text-[#0A2540] px-2 py-0.5 rounded uppercase tracking-wider">
              Dispatched Intelligence
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Single-view comparative operational intelligence based exclusively on actionable dispatched items
          </p>
        </div>
        
        {/* Timeline Controls: Today, This Month, All-Time, and Custom Date Picker */}
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
          {/* Quick Scope Presets */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => {
                setTimeScope("today");
                setSelectedDate("");
                fetchStats("today", "");
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                timeScope === "today"
                  ? "bg-[#0A2540] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>⚡ Today</span>
            </button>

            <button
              onClick={() => {
                setTimeScope("month");
                setSelectedDate("");
                fetchStats("month", "");
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                timeScope === "month"
                  ? "bg-[#0A2540] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📅 This Month</span>
            </button>

            <button
              onClick={() => {
                setTimeScope("all");
                setSelectedDate("");
                fetchStats("all", "");
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                timeScope === "all"
                  ? "bg-[#0A2540] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🌐 All-Time</span>
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-md transition-colors ${
              timeScope === "date" ? "bg-[#0A2540] text-white shadow-xs" : "text-slate-700"
            }`}>
              <Calendar className="w-3.5 h-3.5" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDate(val);
                  if (val) {
                    setTimeScope("date");
                    fetchStats("date", val);
                  }
                }}
                className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${
                  timeScope === "date" ? "text-white" : "text-slate-700"
                }`}
                title="Select specific date"
              />
            </div>
            {timeScope === "date" && (
              <button
                onClick={() => {
                  setSelectedDate("");
                  setTimeScope("month");
                  fetchStats("month", "");
                }}
                className="text-[10px] text-slate-400 hover:text-slate-700 font-bold px-1.5 cursor-pointer"
                title="Reset to month"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sync Button */}
          <button
            onClick={() => fetchStats()}
            className="flex items-center space-x-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCw className="w-3 h-3 text-slate-500" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 1. Compact Aggregate Stat Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Dispatched */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-[#0A2540] p-3 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {timeScope === "today" && "Dispatched Today"}
              {timeScope === "month" && "Dispatched (Month)"}
              {timeScope === "all" && "Total (All-Time)"}
              {timeScope === "date" && `Dispatched (${formattedDate || selectedDate})`}
            </p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">
              {stats.total_items ?? stats.total_items_month}
            </h3>
            <p className="text-[8.5px] text-slate-500 font-medium">
              {timeScope === "today" && "Actionable items dispatched today"}
              {timeScope === "month" && "Actionable items this month"}
              {timeScope === "all" && "Cumulative actionable dispatches"}
              {timeScope === "date" && `Dispatched on ${formattedDate || selectedDate}`}
            </p>
          </div>
          <div className="w-8 h-8 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-center text-[#0A2540] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Urgent Action Required */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-red-600 p-3 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Urgent Action</p>
            <h3 className="text-2xl font-black text-red-600 leading-tight">{stats.urgent_required}</h3>
            <p className="text-[8.5px] text-red-500/80 font-medium">
              {timeScope === "today" ? "Critical today" : timeScope === "date" ? `Critical on ${formattedDate || selectedDate}` : "Critical / High severity"}
            </p>
          </div>
          <div className="w-8 h-8 bg-red-50 border border-red-100 rounded-lg flex items-center justify-center text-red-600 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Under Monitoring */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 p-3 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Under Monitoring</p>
            <h3 className="text-2xl font-black text-slate-800 leading-tight">{stats.under_monitoring}</h3>
            <p className="text-[8.5px] text-slate-500 font-medium">
              Active assigned cases
            </p>
          </div>
          <div className="w-8 h-8 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Resolved */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-600 p-3 rounded-xl shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">
              {timeScope === "month" ? "Resolved (Month)" : "Resolved Cases"}
            </p>
            <h3 className="text-2xl font-black text-emerald-600 leading-tight">
              {stats.resolved_count ?? stats.resolved_month}
            </h3>
            <p className="text-[8.5px] text-emerald-600/80 font-medium">
              ATR verified closed
            </p>
          </div>
          <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Card 5: Resolution Percentage */}
        <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-600 p-3 rounded-xl shadow-xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="space-y-0.5">
            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider">Resolution Rate</p>
            <h3 className="text-2xl font-black text-indigo-600 leading-tight">{stats.resolved_percentage}%</h3>
            <p className="text-[8.5px] text-indigo-500/80 font-medium">
              Of dispatched cases
            </p>
          </div>
          <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <Percent className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 2. Visual Analytics Section: Fully visible Officer and Department Bar Graphs (NO SCROLLBARS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* GRAPHIC 1: Officer-wise Complaints Bar Graph */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            {/* Header & Urgency Legend */}
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-100 pb-2.5">
              <div className="border-l-3 border-l-[#0A2540] pl-2.5">
                <h4 className="text-xs sm:text-sm font-black text-[#0A2540] flex items-center">
                  <User className="w-3.5 h-3.5 text-blue-600 mr-1.5" />
                  Officer-wise Complaints Distribution
                </h4>
                <p className="text-[9.5px] text-slate-400">
                  Workload & urgency allocation across assigned officers
                </p>
              </div>

              {/* Urgency Color Legend */}
              <div className="flex items-center space-x-2 text-[9px] font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-150 shrink-0">
                <div className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  <span className="text-slate-600">Urgent</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-slate-600">Active</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-600">Done</span>
                </div>
              </div>
            </div>

            {/* Non-scrollable Full Officer List */}
            {officerList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No officer dispatches found for selected timeline
              </div>
            ) : (
              <div className="space-y-2">
                {officerList.map((off, index) => {
                  const urgent = off.urgent_count || 0;
                  const monitoring = off.monitoring_count || 0;
                  const resolved = off.resolved_count || 0;
                  const total = off.count;
                  const sharePct = Math.round((total / totalOfficerDispatchesForScale) * 100);
                  const barScaleWidth = Math.max(15, Math.round((total / maxOfficerCount) * 100));

                  const urgentWidth = total > 0 ? (urgent / total) * 100 : 0;
                  const monWidth = total > 0 ? (monitoring / total) * 100 : 0;
                  const resWidth = total > 0 ? (resolved / total) * 100 : 0;

                  return (
                    <div key={index} className="space-y-1 p-1.5 rounded-lg hover:bg-slate-50/70 transition-colors">
                      {/* Officer Label & Stats */}
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[9px]">
                            {index + 1}
                          </span>
                          <span className="font-extrabold text-slate-800">
                            {formatPersonName(off.officer_name)}
                          </span>
                          {off.short_code && (
                            <span className="text-[8.5px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.2 rounded">
                              {off.short_code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5 font-bold">
                          <span className="text-[#0A2540]">
                            {total} {total === 1 ? "case" : "cases"}
                          </span>
                          <span className="text-[9.5px] text-slate-400">
                            ({sharePct}%)
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar: Proportional Width + Segmented Urgency Fill */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${barScaleWidth}%` }}
                          className="h-full rounded-full overflow-hidden flex shadow-xs transition-all duration-300"
                        >
                          {urgent > 0 && (
                            <div
                              style={{ width: `${urgentWidth}%` }}
                              className="bg-red-600 h-full"
                              title={`${urgent} Urgent`}
                            />
                          )}
                          {monitoring > 0 && (
                            <div
                              style={{ width: `${monWidth}%` }}
                              className="bg-amber-500 h-full"
                              title={`${monitoring} Active`}
                            />
                          )}
                          {resolved > 0 && (
                            <div
                              style={{ width: `${resWidth}%` }}
                              className="bg-emerald-500 h-full"
                              title={`${resolved} Resolved`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Urgency Sub-badges inline */}
                      <div className="flex items-center space-x-2 text-[9px] font-bold text-slate-500 pl-5.5">
                        {urgent > 0 && (
                          <span className="text-red-600">
                            🔴 {urgent} Urgent
                          </span>
                        )}
                        {monitoring > 0 && (
                          <span className="text-amber-600">
                            🟡 {monitoring} Active
                          </span>
                        )}
                        {resolved > 0 && (
                          <span className="text-emerald-600">
                            🟢 {resolved} Done
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
            <span>Officers Assigned: <strong>{officerList.length}</strong></span>
            <span>Workload Total: <strong>{totalOfficerDispatches} {totalOfficerDispatches === 1 ? "dispatch" : "dispatches"}</strong></span>
          </div>
        </div>

        {/* GRAPHIC 2: Department-wise Complaints Bar Graph */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            {/* Header & Subtitle */}
            <div className="flex items-center justify-between gap-2 mb-3 border-b border-slate-100 pb-2.5">
              <div className="border-l-3 border-l-amber-500 pl-2.5">
                <h4 className="text-xs sm:text-sm font-black text-[#0A2540] flex items-center">
                  <Building2 className="w-3.5 h-3.5 text-amber-600 mr-1.5" />
                  Department-wise Complaints Distribution
                </h4>
                <p className="text-[9.5px] text-slate-400">
                  Branch grievance load categorized by distress
                </p>
              </div>

              {deptList.length > 0 && (
                <div className="text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded flex items-center space-x-1 shrink-0">
                  <Flame className="w-2.5 h-2.5 text-amber-600" />
                  <span>Top: {deptList[0].department.split("(")[0].trim()}</span>
                </div>
              )}
            </div>

            {/* Non-scrollable Full Department List */}
            {deptList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No departmental dispatches found for selected timeline
              </div>
            ) : (
              <div className="space-y-2">
                {deptList.map((dept, index) => {
                  const count = dept.count;
                  const urgent = dept.urgent_count || 0;
                  const monitoring = dept.monitoring_count || 0;
                  const resolved = dept.resolved_count || 0;
                  const sharePct = Math.round((count / totalDeptDispatchesForScale) * 100);
                  const barScaleWidth = Math.max(12, Math.round((count / maxDeptCount) * 100));
                  const barColor = DEPT_BAR_COLORS[dept.department] || "bg-[#0A2540]";

                  return (
                    <div key={index} className="space-y-1 p-1.5 rounded-lg hover:bg-slate-50/70 transition-colors">
                      {/* Department Label & Stats */}
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center space-x-1.5">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${DEPT_STYLES[dept.department] || "bg-slate-100 text-slate-700"}`}>
                            {dept.department}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5 font-bold">
                          <span className="text-[#0A2540]">
                            {count} {count === 1 ? "complaint" : "complaints"}
                          </span>
                          <span className="text-[9.5px] text-slate-400">
                            ({sharePct}%)
                          </span>
                        </div>
                      </div>

                      {/* Visual Bar: Proportional Width to Max Department */}
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${barScaleWidth}%` }}
                          className={`${barColor} h-full rounded-full transition-all duration-300 shadow-xs`}
                        />
                      </div>

                      {/* Urgency & Status Indicators */}
                      <div className="flex items-center space-x-2.5 text-[9px] font-bold text-slate-500">
                        {urgent > 0 ? (
                          <span className="text-red-600 font-extrabold">
                            🔴 {urgent} Urgent
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ⚪ 0 Critical
                          </span>
                        )}
                        {monitoring > 0 && (
                          <span className="text-amber-600">
                            🟡 {monitoring} Active
                          </span>
                        )}
                        {resolved > 0 && (
                          <span className="text-emerald-600">
                            🟢 {resolved} Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
            <span>Branches Affected: <strong>{deptList.length}</strong></span>
            <span>Total Mapped Complaints: <strong>{totalDeptDispatches}</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Compact Daily Urgency Dynamics & Trend Curve */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-2 border-b border-slate-100 pb-2">
          <div className="border-l-3 border-l-red-600 pl-2.5">
            <h4 className="text-xs sm:text-sm font-black text-[#0A2540] flex items-center">
              <TrendingUp className="w-3.5 h-3.5 text-red-600 mr-1.5" />
              Daily Urgency Dynamics & Volume Trends
            </h4>
            <p className="text-[9.5px] text-slate-400">
              {timeScope === "month" && "Daily volume trend for Critical (High) vs Watch (Medium) severity dispatched complaints this month"}
              {timeScope === "all" && "Daily volume trend across the past 30 days"}
              {timeScope === "today" && "7-day volume trajectory leading up to today"}
              {timeScope === "date" && `7-day volume trajectory leading up to ${formattedDate || selectedDate}`}
            </p>
          </div>
          
          {/* Chart Legend */}
          <div className="flex items-center space-x-2.5 text-[9px] font-bold bg-slate-50 px-2.5 py-1 rounded border border-slate-150 shrink-0">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
              <span className="text-slate-700">Critical</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span className="text-slate-700">Watch</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center pt-1">
          {drawUrgencyChart()}
        </div>
      </div>
    </div>
  );
}
