"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, BrainCircuit, TrendingDown, AlertTriangle, 
  ShieldAlert, CheckCircle2, RefreshCw, BarChart2, 
  Layers, MapPin, Zap, MessageSquare, Compass, ArrowUpRight,
  Flame, HelpCircle, Activity, FileText, ChevronRight, Scale
} from "lucide-react";
import { DEPT_STYLES } from "./desk-tab";

interface DomainSuffering {
  department: string;
  total_grievances: number;
  critical_count: number;
  suffering_score: number;
  vulnerability_rating: "Critical" | "High" | "Moderate";
  most_affected_wards: string;
  sample_headlines: string[];
}

interface VulnerableWard {
  ward_no: number;
  zone: string;
  locality: string;
  total_grievances: number;
  critical_count: number;
  primary_department: string;
  risk_level: string;
  risk_score: number;
  sample_headlines: string[];
}

interface ZoneMood {
  zone_code: string;
  zone_name: string;
  total_grievances: number;
  critical_count: number;
  mood_label: string;
  mood_score: number;
}

interface DiscussionTopic {
  topic: string;
  department: string;
  volume_share: string;
  sentiment: string;
  key_concern: string;
  wards_affected: string;
}

interface AISynthesis {
  executive_summary: string;
  district_mood_verdict: string;
  most_suffering_ward_analysis: string;
  key_public_debates: Array<{
    theme: string;
    summary: string;
    severity: string;
  }>;
  suggested_next_steps?: string[];
  immediate_commissioner_directives?: string[];
}

interface SentimentResponse {
  success: boolean;
  metrics: {
    total_items: number;
    net_sentiment_score: number;
    public_pressure_level: string;
    distribution: {
      critical_negative: number;
      moderate_concern: number;
      neutral: number;
      positive: number;
    };
    percentages: {
      critical_negative: number;
      moderate_concern: number;
      neutral: number;
      positive: number;
    };
    top_suffering_domains: DomainSuffering[];
    top_vulnerable_wards: VulnerableWard[];
    zone_moods: Record<string, ZoneMood>;
    discussion_topics: DiscussionTopic[];
  };
  ai_synthesis: AISynthesis | null;
  last_synthesized_at?: string | null;
  queried_count: number;
}

export default function SentimentTab() {
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("All");
  const [selectedViewTab, setSelectedViewTab] = useState<"overview" | "wards" | "domains" | "topics">("overview");

  // Fetch sentiment data
  // When forceAI=false, only metrics are recomputed and last AI analysis is preserved
  // When forceAI=true (user clicked Refresh), a fresh LLM synthesis is executed and saved
  const fetchSentimentData = async (forceAI: boolean = false) => {
    if (forceAI) setGeneratingAI(true);
    if (!data) setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const deptParam = selectedDeptFilter !== "All" ? `&department=${encodeURIComponent(selectedDeptFilter)}` : "";
      const res = await fetch(`${apiUrl}/sentiment-analysis?date=all&generate_ai=${forceAI}${deptParam}`);
      if (res.ok) {
        const json: SentimentResponse = await res.json();
        
        setData(prev => {
          // If forceAI was false, preserve existing ai_synthesis from previous state or cache
          const effectiveAI = json.ai_synthesis || prev?.ai_synthesis || null;
          const effectiveTime = (forceAI ? new Date().toISOString() : null) 
                               || json.last_synthesized_at 
                               || prev?.last_synthesized_at 
                               || null;

          const updated: SentimentResponse = {
            ...json,
            ai_synthesis: effectiveAI,
            last_synthesized_at: effectiveTime
          };

          try {
            localStorage.setItem(`mcl_sentiment_cache_${selectedDeptFilter}`, JSON.stringify(updated));
          } catch {}

          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to load sentiment analysis:", err);
    } finally {
      setLoading(false);
      setGeneratingAI(false);
    }
  };

  // On tab click or filter change: load cached analysis immediately and fetch latest metrics without calling LLM
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`mcl_sentiment_cache_${selectedDeptFilter}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.metrics) {
          setData(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // Only update numeric metrics in the background; do NOT re-synthesize AI on tab navigation
    fetchSentimentData(false);
  }, [selectedDeptFilter]);

  const metrics = data?.metrics;
  const ai = data?.ai_synthesis;

  // Sentiment bar helper
  const getScoreColor = (score: number) => {
    if (score <= -50) return "text-red-600 bg-red-50 border-red-200";
    if (score <= -20) return "text-amber-600 bg-amber-50 border-amber-200";
    if (score <= 10) return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-indigo-700" />
            </div>
            <h2 className="text-lg font-black text-[#0A2540] flex items-center">
              AI Sentiment & District Public Mood Radar
            </h2>
            <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Gemini & Claude AI
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time natural language synthesis of print media sentiment, ward-level suffering indices, and district-wide public discourse based on verified dispatched items (excluding un-dispatched noise).
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {data?.last_synthesized_at && (
            <div className="hidden sm:flex flex-col items-end text-[10.5px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Last AI Analysis</span>
              <span className="text-slate-700 font-bold">
                {new Date(data.last_synthesized_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })},{" "}
                {new Date(data.last_synthesized_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </span>
            </div>
          )}

          <button
            onClick={() => fetchSentimentData(true)}
            disabled={generatingAI}
            className="flex items-center space-x-2 bg-gradient-to-r from-[#0A2540] to-indigo-900 hover:from-slate-850 hover:to-indigo-950 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            title="Click to run fresh AI sentiment synthesis"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${generatingAI ? "animate-spin" : ""}`} />
            <span>{generatingAI ? "Re-Synthesizing AI..." : "Refresh & Re-Synthesize"}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Net District Mood Gauge */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden border-l-4 border-l-red-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Net Sentiment Index
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Media Pressure
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-black text-slate-800">
                {metrics?.net_sentiment_score ?? "--"}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 100</span>
            </div>
            <p className="text-xs font-extrabold text-red-600 mt-1">
              {metrics?.public_pressure_level || "Analyzing..."}
            </p>
          </div>
          
          {/* Visual Mini Gauge */}
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden flex">
            <div 
              style={{ width: `${Math.min(100, Math.max(0, 100 - (metrics?.net_sentiment_score ? Math.abs(metrics.net_sentiment_score) : 50)))}%` }} 
              className="bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 h-full rounded-full" 
            />
          </div>
        </div>

        {/* Card 2: Critical Outrage Share */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-amber-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Agitated Public Reports
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-black text-slate-800">
                {metrics?.percentages.critical_negative ?? 0}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({metrics?.distribution.critical_negative ?? 0} items)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              High severity media reports demanding immediate executive action.
            </p>
          </div>
        </div>

        {/* Card 3: Top Suffering Domain */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-[#0A2540] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Most Vulnerable Domain
              </span>
              <ShieldAlert className="w-4 h-4 text-[#0A2540]" />
            </div>
            <p className="text-base font-black text-[#0A2540] mt-2 line-clamp-1">
              {metrics?.top_suffering_domains[0]?.department || "Operations & Maintenance (O&M)"}
            </p>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {metrics?.top_suffering_domains[0]?.total_grievances || 0} reported issues • {metrics?.top_suffering_domains[0]?.critical_count || 0} critical
            </p>
          </div>
        </div>

        {/* Card 4: Most Affected Ward */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 border-l-indigo-600 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Highest Crisis Ward
              </span>
              <MapPin className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-2xl font-black text-slate-800">
                Ward {metrics?.top_vulnerable_wards[0]?.ward_no || 9}
              </span>
              <span className="text-xs font-bold text-indigo-700">
                ({metrics?.top_vulnerable_wards[0]?.locality || "Rahon Road"})
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Primary pain: <strong className="text-slate-700">{metrics?.top_vulnerable_wards[0]?.primary_department || "O&M / Roads"}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 3. AI Executive Intelligence Briefing Box */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0A2540] to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800 relative overflow-hidden">
        {/* Background glow circle */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
                Executive AI Media Intelligence Synthesis
              </h3>
            </div>
            <span className="text-[10px] bg-white/10 text-slate-300 px-3 py-1 rounded-full font-mono border border-white/10">
              Corpus: {metrics?.total_items || 0} Daily Reports Analyzed
            </span>
          </div>

          {/* AI Verdict Quote */}
          {ai?.district_mood_verdict && (
            <div className="bg-white/5 border-l-4 border-amber-400 p-3.5 rounded-r-xl">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block mb-0.5">
                District Mood Verdict
              </span>
              <p className="text-sm font-bold text-white leading-snug italic">
                "{ai.district_mood_verdict}"
              </p>
            </div>
          )}

          {/* Executive Summary */}
          <div className="text-xs text-slate-200 leading-relaxed font-normal bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
            <p>
              {generatingAI 
                ? "Generating real-time natural language synthesis using Gemini & Claude..." 
                : (ai?.executive_summary || "No AI synthesis generated yet for this view. Click 'Refresh & Re-Synthesize' above to generate a full analysis.")}
            </p>
          </div>

          {/* Immediate Suggested Next Steps */}
          {((ai?.suggested_next_steps && ai.suggested_next_steps.length > 0) || (ai?.immediate_commissioner_directives && ai.immediate_commissioner_directives.length > 0)) && (
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                💡 Immediate Suggested Next Steps for Field Engineers & Zonal Teams
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {(ai?.suggested_next_steps || ai?.immediate_commissioner_directives || []).map((dir, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-start space-x-2.5 bg-black/25 border border-white/10 p-3 rounded-xl text-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-900 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-slate-100 font-medium leading-relaxed">{dir}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Navigation Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-bold">
        <button
          onClick={() => setSelectedViewTab("overview")}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all ${
            selectedViewTab === "overview"
              ? "bg-[#0A2540] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>District Sentiment & Zones</span>
        </button>

        <button
          onClick={() => setSelectedViewTab("wards")}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all ${
            selectedViewTab === "wards"
              ? "bg-[#0A2540] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Top Suffering Wards Leaderboard</span>
        </button>

        <button
          onClick={() => setSelectedViewTab("domains")}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all ${
            selectedViewTab === "domains"
              ? "bg-[#0A2540] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Domain Vulnerability Matrix</span>
        </button>

        <button
          onClick={() => setSelectedViewTab("topics")}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg transition-all ${
            selectedViewTab === "topics"
              ? "bg-[#0A2540] text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Citizen Discourse & Topics</span>
        </button>
      </div>

      {/* 5. TAB 1: Overview & Zone Moods */}
      {selectedViewTab === "overview" && (
        <div className="space-y-6">
          {/* Sentiment Distribution Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0A2540]">
              Overall Public Sentiment Volume Distribution
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-red-50/70 border border-red-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-red-600 uppercase block">Critical Outrage</span>
                <span className="text-2xl font-black text-red-700 block mt-0.5">
                  {metrics?.percentages.critical_negative ?? 0}%
                </span>
                <span className="text-[10px] text-red-500 font-semibold">
                  {metrics?.distribution.critical_negative ?? 0} high urgency reports
                </span>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-amber-700 uppercase block">Moderate Concern</span>
                <span className="text-2xl font-black text-amber-800 block mt-0.5">
                  {metrics?.percentages.moderate_concern ?? 0}%
                </span>
                <span className="text-[10px] text-amber-600 font-semibold">
                  {metrics?.distribution.moderate_concern ?? 0} civic complaints
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Neutral Routine</span>
                <span className="text-2xl font-black text-slate-700 block mt-0.5">
                  {metrics?.percentages.neutral ?? 0}%
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  {metrics?.distribution.neutral ?? 0} informational items
                </span>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Positive / Resolved</span>
                <span className="text-2xl font-black text-emerald-800 block mt-0.5">
                  {metrics?.percentages.positive ?? 0}%
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {metrics?.distribution.positive ?? 0} verified actions
                </span>
              </div>
            </div>

            {/* Combined Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100">
              <div style={{ width: `${metrics?.percentages.critical_negative || 0}%` }} className="bg-red-600 h-full" title="Critical Outrage" />
              <div style={{ width: `${metrics?.percentages.moderate_concern || 0}%` }} className="bg-amber-500 h-full" title="Moderate Concern" />
              <div style={{ width: `${metrics?.percentages.neutral || 0}%` }} className="bg-slate-300 h-full" title="Neutral" />
              <div style={{ width: `${metrics?.percentages.positive || 0}%` }} className="bg-emerald-500 h-full" title="Positive / Resolved" />
            </div>
          </div>

          {/* Zone-wise Public Mood Comparison */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0A2540]">
                Administrative Zone-Wise Sentiment & Mood Breakdown
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comparison of public pressure, grievance volume, and mood stability across all four Ludhiana zones.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics && Object.values(metrics.zone_moods).map((z) => (
                <div 
                  key={z.zone_code}
                  className="bg-slate-50/70 border border-slate-200 p-4 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                        Zone {z.zone_code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-0.5">{z.zone_name}</h4>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                      z.mood_label.includes("Volatile") 
                        ? "bg-red-100 text-red-700 border-red-200" 
                        : z.mood_label.includes("Tense")
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}>
                      {z.mood_label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Reported Grievances</span>
                      <p className="text-base font-black text-slate-800">{z.total_grievances}</p>
                    </div>
                    <div>
                      <span className="text-[9px] text-red-500 uppercase font-bold">Critical Outcry</span>
                      <p className="text-base font-black text-red-600">{z.critical_count}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: Top Suffering Wards Leaderboard */}
      {selectedViewTab === "wards" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0A2540] flex items-center">
                <MapPin className="w-4 h-4 text-red-600 mr-1.5" />
                Ludhiana Top Suffering Wards Ranking
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Wards identified by AI with highest persistent public outcry, infrastructure distress, and grievance volume.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {metrics?.top_vulnerable_wards.map((w, idx) => (
              <div 
                key={w.ward_no}
                className="p-4 rounded-xl border border-slate-200 hover:border-[#0A2540] bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs ${
                      idx === 0 ? "bg-red-600 text-white" : idx === 1 ? "bg-amber-500 text-slate-900" : "bg-[#0A2540] text-white"
                    }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        Ward {w.ward_no} — {w.locality} (Zone {w.zone})
                      </h4>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Primary Distress Factor: <strong className="text-slate-700">{w.primary_department}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                      w.risk_level.includes("Severe") 
                        ? "bg-red-100 text-red-700 border-red-200" 
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}>
                      {w.risk_level}
                    </span>
                    <span className="bg-[#0A2540] text-white text-[11px] font-black px-2.5 py-1 rounded-lg">
                      {w.total_grievances} Issues ({w.critical_count} Critical)
                    </span>
                  </div>
                </div>

                {/* Sample Headline Chips */}
                {w.sample_headlines && w.sample_headlines.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      Recent Media Headlines:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {w.sample_headlines.map((hl, hIdx) => (
                        <span 
                          key={hIdx} 
                          className="text-[10px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                        >
                          "{hl}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. TAB 3: Domain Vulnerability Matrix */}
      {selectedViewTab === "domains" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0A2540] flex items-center">
              <Layers className="w-4 h-4 text-indigo-600 mr-1.5" />
              Municipal Domain & Department Vulnerability Matrix
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Comprehensive ranking of municipal departments suffering from citizen dissatisfaction and operational backlogs.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] uppercase tracking-wider font-extrabold text-slate-500">
                  <th className="py-3 px-3">Municipal Department</th>
                  <th className="py-3 px-3">Total Issues</th>
                  <th className="py-3 px-3">Critical Ratio</th>
                  <th className="py-3 px-3">Vulnerability Level</th>
                  <th className="py-3 px-3">Most Suffering Wards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.top_suffering_domains.map((dom) => (
                  <tr key={dom.department} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${DEPT_STYLES[dom.department] || "bg-slate-100 text-slate-700"}`}>
                        {dom.department}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-slate-800">
                      {dom.total_grievances}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-extrabold text-red-600">
                        {dom.critical_count}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">
                        ({Math.round((dom.critical_count / dom.total_grievances) * 100)}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                        dom.vulnerability_rating === "Critical"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : dom.vulnerability_rating === "High"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}>
                        {dom.vulnerability_rating}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-bold text-slate-700 text-[11px]">
                      {dom.most_affected_wards}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. TAB 4: Public Discourse Topics */}
      {selectedViewTab === "topics" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0A2540] flex items-center">
              <MessageSquare className="w-4 h-4 text-emerald-600 mr-1.5" />
              What is the District Discussing Most? (Public Discourse Topics)
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Major citizen debates, civic controversies, and recurring media coverage clusters in Ludhiana.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics?.discussion_topics.map((t, idx) => (
              <div 
                key={idx}
                className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-2.5 hover:border-slate-350 transition-all"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      Discourse Cluster #{idx + 1}
                    </span>
                    <h4 className="text-xs font-black text-slate-800 mt-0.5">{t.topic}</h4>
                  </div>
                  <span className="bg-[#0A2540] text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                    {t.volume_share} Share
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  {t.key_concern}
                </p>

                <div className="pt-2 border-t border-slate-200 text-[10px] flex items-center justify-between text-slate-500 font-semibold">
                  <span>Branch: <strong>{t.department}</strong></span>
                  <span>Affected: <strong>{t.wards_affected}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
