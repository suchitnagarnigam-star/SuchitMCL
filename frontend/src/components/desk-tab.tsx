import React, { useState, useEffect } from "react";
import { Search, AlertCircle, Calendar, RefreshCw, Trash2, Send, ChevronDown, ChevronUp, Columns, LayoutGrid, Table, MapPin, Copy, Check } from "lucide-react";
import DispatchModal from "./dispatch-modal";

interface Officer {
  id: string;
  short_code: string;
  full_name: string;
  designation: string;
  officer_type: string;
  zone?: string | null;
  department?: string | null;
  whatsapp_number: string;
}

interface StructuredSummary {
  when?: string;
  where?: string;
  what?: string;
  next_steps?: string;
}

interface NewsItem {
  id: string;
  headline: string;
  body: string;
  publication: string;
  department: string;
  severity: string;
  summary: string | StructuredSummary;
  page_number: number;
  suggested_officer?: Officer | null;
  created_at?: string;
}

interface DeskTabProps {
  officers: Officer[];
}

export const DEPT_STYLES: Record<string, string> = {
  "Operations & Maintenance (O&M)": "bg-blue-50 text-blue-700 border border-blue-200/60",
  "Bridges & Roads (B&R)": "bg-amber-50 text-amber-700 border border-amber-200/60",
  "Horticulture / Parks & Squares": "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  "Solid Waste Management (SWM)": "bg-orange-50 text-orange-800 border border-orange-200/60",
  "Sanitation & Vector Control": "bg-teal-50 text-teal-700 border border-teal-200/60",
  "Health Branch": "bg-red-50 text-red-700 border border-red-200/60",
  "Town Planning (Building Branch)": "bg-indigo-50 text-indigo-700 border border-indigo-200/60",
  "Tehbazari / Land & Encroachment": "bg-yellow-50 text-yellow-800 border border-yellow-200/60",
  "Licensing & Health License Branch": "bg-cyan-50 text-cyan-700 border border-cyan-200/60",
  "Property Tax / House Tax Branch": "bg-violet-50 text-violet-700 border border-violet-200/60",
  "Accounts & Finance": "bg-lime-50 text-lime-800 border border-lime-200/60",
  "Establishment & General Branch": "bg-pink-50 text-pink-700 border border-pink-200/60",
  "Legal Cell": "bg-purple-50 text-purple-700 border border-purple-200/60",
  "Public Grievance Redressal / IT Cell": "bg-sky-50 text-sky-700 border border-sky-200/60",
  "Fire Brigade & Emergency Services": "bg-rose-50 text-rose-700 border border-rose-200/60"
};

// DetailPane sub-component
interface DetailPaneProps {
  item: NewsItem;
  selectedDate: string;
  isMonsoon: boolean;
  details: {
    when: string;
    where: string;
    what: string;
    next_steps: string;
  };
  handleDiscard: (id: string) => void;
  setActiveDispatchItem: (item: NewsItem) => void;
}

function DetailPane({
  item,
  selectedDate,
  isMonsoon,
  details,
  handleDiscard,
  setActiveDispatchItem
}: DetailPaneProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.body || details.what);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  let severityText = "Low Severity";
  let severityColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
  if (item.severity === "High") {
    severityText = "High Severity";
    severityColor = "text-red-700 bg-red-50 border-red-100 animate-pulse";
  } else if (item.severity === "Medium") {
    severityText = "Medium Severity";
    severityColor = "text-amber-700 bg-amber-50 border-amber-100";
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-[calc(100vh-270px)] min-h-[500px] overflow-hidden">
      {/* Sticky Header inside Detail View */}
      <div className="p-5 border-b border-slate-250/60 bg-slate-50/50 flex-none space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md ${DEPT_STYLES[item.department] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
              {item.department}
            </span>
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border flex items-center ${severityColor}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
              {severityText}
            </span>
            {isMonsoon && (
              <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-1 rounded-md border border-red-200 uppercase tracking-wider animate-pulse flex items-center">
                ☔ Monsoon Priority
              </span>
            )}
          </div>
          
          {/* Action buttons at the top right of panel */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDiscard(item.id)}
              className="flex items-center space-x-1.5 bg-white hover:bg-red-50 text-red-650 hover:text-red-700 text-[10.5px] font-black px-3 py-2 rounded-lg border border-red-200 transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard</span>
            </button>
            
            <button
              onClick={() => setActiveDispatchItem(item)}
              className="flex items-center space-x-1.5 bg-[#0A2540] hover:bg-slate-800 text-white text-[10.5px] font-black px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch</span>
            </button>
          </div>
        </div>

        <h3 className="text-sm md:text-base font-extrabold text-slate-800 leading-snug tracking-tight">
          {item.headline}
        </h3>

        <div className="flex items-center space-x-3 text-[10px] text-slate-450 font-bold">
          <span>📰 {item.publication}</span>
          <span>•</span>
          <span>Page {item.page_number}</span>
          <span>•</span>
          <span>📅 Ingested: {formatDate(item.created_at || selectedDate)}</span>
        </div>
      </div>

      {/* Scrollable Body Pane */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* 1. Grievance Summary Grid */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
            <span className="w-1.5 h-3 bg-[#0A2540] rounded-sm mr-2" />
            AI Structured Summary
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1 shadow-xs">
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">📅 Occurrence / Timeframe</span>
              <p className="text-slate-800 font-semibold text-[11px]">{details.when}</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1 shadow-xs">
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">📍 Ward / Concerned Location</span>
              <p className="text-slate-800 font-bold text-[11px]">{details.where}</p>
            </div>
          </div>
        </div>

        {/* 2. Suggested Action directive block */}
        <div className="bg-amber-50/40 border border-amber-200/70 p-4 rounded-xl space-y-1.5 shadow-xs">
          <span className="text-[9.5px] text-amber-700 font-extrabold uppercase tracking-wider flex items-center">
            💡 Commissioner suggested directive
          </span>
          <p className="text-slate-700 font-semibold leading-relaxed text-[11px]">
            {details.next_steps}
          </p>
          <div className="text-[9px] text-slate-455 pt-1 border-t border-amber-100 flex items-center justify-between font-medium">
            <span>Suggested Assignee: <strong className="text-slate-800">{item.suggested_officer?.full_name || "Vineet Kumar"} ({item.suggested_officer?.short_code || "JC (V)"})</strong></span>
            <span>Designation: {item.suggested_officer?.designation || "Joint Commissioner"}</span>
          </div>
        </div>

        {/* 3. What (The issue details) */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
            <span className="w-1.5 h-3 bg-[#0A2540] rounded-sm mr-2" />
            Issue description
          </h4>
          <p className="text-slate-700 text-[11.5px] leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-150 font-medium">
            {details.what}
          </p>
        </div>

        {/* 4. Full Transcribed text with Copy Helper */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
              <span className="w-1.5 h-3 bg-[#0A2540] rounded-sm mr-2" />
              Full Ingested Article Text
            </h4>
            <button 
              onClick={handleCopy}
              className="flex items-center space-x-1 text-slate-450 hover:text-[#0A2540] font-bold text-[10px] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Text"}</span>
            </button>
          </div>
          <div className="text-slate-655 leading-relaxed bg-slate-50 border border-slate-200 p-4 rounded-xl font-mono text-[10.5px] max-h-48 overflow-y-auto shadow-xs whitespace-pre-wrap select-all">
            {item.body || details.what}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DeskTab({ officers }: DeskTabProps) {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout views
  const [viewMode, setViewMode] = useState<"split" | "grid" | "table">("split");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Filters
  const [severityFilter, setSeverityFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [activeDispatchItem, setActiveDispatchItem] = useState<NewsItem | null>(null);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Selection states for Bulk Dispatch
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkOfficerId, setBulkOfficerId] = useState("suggested");
  const [bulkRemarks, setBulkRemarks] = useState("");

  const toggleItemExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Default to today's date on mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  const fetchNewsItems = async () => {
    if (!selectedDate) return;
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/news-items?date=${selectedDate}&status=pending`);
      if (!res.ok) throw new Error("Failed to fetch news items");
      const data = await res.json();
      setNewsItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewsItems();
  }, [selectedDate]);

  const handleDispatchSuccess = (newsItemId: string) => {
    setDispatchedIds(prev => {
      const next = new Set(prev);
      next.add(newsItemId);
      return next;
    });

    setActiveDispatchItem(null);

    setTimeout(() => {
      setNewsItems(prev => prev.filter(x => x.id !== newsItemId));
      setDispatchedIds(prev => {
        const next = new Set(prev);
        next.delete(newsItemId);
        return next;
      });
    }, 500);
  };

  const handleDiscard = async (newsItemId: string) => {
    if (!window.confirm("Are you sure you want to discard this news item?")) return;
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/news-items/${newsItemId}/discard`, {
        method: "PUT",
      });
      if (!res.ok) throw new Error("Failed to discard news item");

      setDispatchedIds(prev => {
        const next = new Set(prev);
        next.add(newsItemId);
        return next;
      });

      setTimeout(() => {
        setNewsItems(prev => prev.filter(x => x.id !== newsItemId));
        setDispatchedIds(prev => {
          const next = new Set(prev);
          next.delete(newsItemId);
          return next;
        });
      }, 500);
    } catch (err) {
      console.error(err);
      alert("Error discarding news item");
    }
  };

  const getSummarySearchText = (summary: any): string => {
    if (!summary) return "";
    if (typeof summary === "object") {
      return `${summary.when || ""} ${summary.where || ""} ${summary.what || ""} ${summary.next_steps || ""}`.toLowerCase();
    }
    return summary.toLowerCase();
  };

  const filteredItems = newsItems.filter(item => {
    const matchesSeverity = severityFilter === "All" || item.severity === severityFilter;
    const matchesSearch = item.headline.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          getSummarySearchText(item.summary).includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const getSummaryDetails = (item: NewsItem) => {
    if (typeof item.summary === "object" && item.summary !== null) {
      return {
        when: item.summary.when || "Not specified",
        where: item.summary.where || "Not specified",
        what: item.summary.what || "Not specified",
        next_steps: item.summary.next_steps || "Not specified"
      };
    }
    return {
      when: "Not specified",
      where: "Not specified",
      what: typeof item.summary === "string" ? item.summary : "Not specified",
      next_steps: "Not specified"
    };
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  const isMonsoonRelated = (item: NewsItem) => {
    const details = getSummaryDetails(item);
    const textToSearch = [
      item.headline,
      item.body,
      item.department,
      details.when,
      details.where,
      details.what,
      details.next_steps
    ].join(" ").toLowerCase();

    const monsoonKeywords = [
      "monsoon", "rain", "waterlogging", "flood", "flooding", 
      "drain", "drainage", "sewerage", "overflow", "dengue", 
      "malaria", "mosquito", "nullah", "dariya", "storm", 
      "water accumulation", "barish", "water-logging"
    ];

    return monsoonKeywords.some(kw => textToSearch.includes(kw));
  };

  const toggleSelectItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedItemIds(prev => {
      if (prev.size === filteredItems.length) {
        return new Set();
      } else {
        return new Set(filteredItems.map(item => item.id));
      }
    });
  };

  const handleBulkDispatch = async () => {
    if (selectedItemIds.size === 0) return;
    
    const jcVOfficer = officers.find(o => o.short_code === "JC (V)");
    const fallbackJCVId = jcVOfficer ? jcVOfficer.id : (officers[0]?.id || "");

    const payloadItems = Array.from(selectedItemIds).map(id => {
      const item = newsItems.find(x => x.id === id);
      let finalOfficerId = bulkOfficerId;
      if (bulkOfficerId === "suggested") {
        finalOfficerId = item?.suggested_officer?.id || fallbackJCVId;
      }
      return {
        news_item_id: id,
        officer_id: finalOfficerId,
        remarks: bulkRemarks
      };
    });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/dispatch-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ items: payloadItems })
      });
      if (!res.ok) throw new Error("Bulk dispatch failed");
      
      const dispatchedArray = Array.from(selectedItemIds);
      setDispatchedIds(prev => {
        const next = new Set(prev);
        dispatchedArray.forEach(id => next.add(id));
        return next;
      });
      
      setSelectedItemIds(new Set());
      setBulkRemarks("");
      setBulkOfficerId("suggested");
      
      setTimeout(() => {
        setNewsItems(prev => prev.filter(x => !dispatchedArray.includes(x.id)));
        setDispatchedIds(prev => {
          const next = new Set(prev);
          dispatchedArray.forEach(id => next.delete(id));
          return next;
        });
      }, 500);
      
      alert(`Successfully bulk dispatched ${dispatchedArray.length} items.`);
    } catch (err) {
      console.error(err);
      alert("Error during bulk dispatch");
    }
  };

  const handleBulkDiscard = async () => {
    if (selectedItemIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to discard these ${selectedItemIds.size} items?`)) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const discardArray = Array.from(selectedItemIds);
      
      await Promise.all(discardArray.map(id => 
        fetch(`${apiUrl}/news-items/${id}/discard`, { method: "PUT" })
      ));

      setDispatchedIds(prev => {
        const next = new Set(prev);
        discardArray.forEach(id => next.add(id));
        return next;
      });
      
      setSelectedItemIds(new Set());
      
      setTimeout(() => {
        setNewsItems(prev => prev.filter(x => !discardArray.includes(x.id)));
        setDispatchedIds(prev => {
          const next = new Set(prev);
          discardArray.forEach(id => next.delete(id));
          return next;
        });
      }, 500);
      
      alert(`Successfully discarded ${discardArray.length} items.`);
    } catch (err) {
      console.error(err);
      alert("Error during bulk discard");
    }
  };

  // Sync selected item in split view
  useEffect(() => {
    if (filteredItems.length > 0) {
      const exists = filteredItems.some(x => x.id === selectedItemId);
      if (!exists) {
        setSelectedItemId(filteredItems[0].id);
      }
    } else {
      setSelectedItemId(null);
    }
  }, [filteredItems, selectedItemId]);

  const renderNewsCard = (item: NewsItem, index: number) => {
    const isDispatched = dispatchedIds.has(item.id);
    const isSelected = selectedItemId === item.id;
    const isMonsoon = isMonsoonRelated(item);
    const details = getSummaryDetails(item);
    
    let borderStyle = "border-l-4 border-slate-350";
    
    if (isMonsoon) {
      borderStyle = "border-l-4 border-rose-600 bg-rose-50/5";
    } else if (item.severity === "High") {
      borderStyle = "border-l-4 border-red-500";
    } else if (item.severity === "Medium") {
      borderStyle = "border-l-4 border-amber-500";
    } else if (item.severity === "Low") {
      borderStyle = "border-l-4 border-emerald-500";
    }

    return (
      <div
        key={item.id}
        onClick={() => setSelectedItemId(item.id)}
        className={`group relative bg-white rounded-xl border p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-205 select-none ${
          isSelected 
            ? "border-[#0A2540] ring-1 ring-[#0A2540] bg-slate-50/40" 
            : "border-slate-200 hover:border-slate-300"
        } ${borderStyle} ${isDispatched ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          {/* Left: Department & Monsoon Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md ${DEPT_STYLES[item.department] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
              {item.department}
            </span>
            {isMonsoon && (
              <span className="bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 rounded-full inline-flex items-center border border-red-200 uppercase tracking-wider animate-pulse">
                ☔ Monsoon
              </span>
            )}
          </div>

          {/* Right: Checkbox */}
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox"
              checked={selectedItemIds.has(item.id)}
              onChange={(e) => toggleSelectItem(item.id, e as any)}
              className="rounded border-slate-300 text-[#0A2540] focus:ring-[#0A2540] cursor-pointer w-4 h-4"
            />
          </div>
        </div>

        {/* Headline */}
        <h4 className="font-extrabold text-slate-800 text-[11px] leading-snug group-hover:text-[#0A2540] transition-colors line-clamp-2 mb-1.5">
          {item.headline}
        </h4>

        {/* Short Summary Description */}
        <p className="text-slate-500 text-[10.5px] leading-relaxed line-clamp-2 mb-2.5 font-medium">
          {details.what}
        </p>

        {/* Card Footer: Metadata */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[9.5px] text-slate-400 font-bold">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3 h-3 text-slate-450 shrink-0" />
            <span className="truncate max-w-[150px] font-semibold">{details.where}</span>
          </div>
          <div className="flex items-center space-x-1 font-semibold">
            <span>{item.publication}</span>
            <span>•</span>
            <span>P.{item.page_number}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Keyword Search */}
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0A2540] focus:bg-white transition-colors"
            />
          </div>

          {/* Severity Filters */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            {["All", "High", "Medium", "Low"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3.5 py-1.5 rounded-md font-bold transition-all duration-150 ${
                  severityFilter === sev
                    ? "bg-[#0A2540] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 outline-none cursor-pointer font-bold"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs">
            <button
              onClick={() => setViewMode("split")}
              className={`p-1.5 rounded-md transition-all duration-150 flex items-center space-x-1 ${
                viewMode === "split"
                  ? "bg-[#0A2540] text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-850"
              }`}
              title="Split Reader View (Recommended)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] px-1 font-bold">Split View</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-all duration-150 flex items-center space-x-1 ${
                viewMode === "grid"
                  ? "bg-[#0A2540] text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-850"
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] px-1 font-bold">Grid View</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-md transition-all duration-150 flex items-center space-x-1 ${
                viewMode === "table"
                  ? "bg-[#0A2540] text-white shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-850"
              }`}
              title="Tabular View"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px] px-1 font-bold">Table View</span>
            </button>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={fetchNewsItems}
          className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 hover:text-[#0A2540] hover:border-[#0A2540] px-4 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm self-end md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Desk</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0A2540] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading Commissioner's Desk items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-400" />
          <div>
            <h3 className="text-base font-bold text-slate-800">No Pending News Items</h3>
            <p className="text-xs text-slate-500 mt-1">There are no pending news items matching the filters for this date.</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === "split" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left List Pane (5 cols) */}
              <div className="lg:col-span-5 space-y-4 max-h-[calc(100vh-270px)] min-h-[500px] overflow-y-auto pr-1 pb-10">
                {filteredItems.map((item, idx) => renderNewsCard(item, idx))}
              </div>

              {/* Right Detail Pane (7 cols) */}
              <div className="lg:col-span-7 animate-fade-in">
                {selectedItemId ? (
                  (() => {
                    const selectedItem = filteredItems.find(x => x.id === selectedItemId);
                    if (!selectedItem) return null;
                    const isMonsoon = isMonsoonRelated(selectedItem);
                    const details = getSummaryDetails(selectedItem);
                    return (
                      <DetailPane 
                        item={selectedItem}
                        selectedDate={selectedDate}
                        isMonsoon={isMonsoon}
                        details={details}
                        handleDiscard={handleDiscard}
                        setActiveDispatchItem={setActiveDispatchItem}
                      />
                    );
                  })()
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 min-h-[500px] flex flex-col items-center justify-center space-y-4 shadow-sm">
                    <AlertCircle className="w-12 h-12 text-slate-300 animate-pulse" />
                    <p className="text-sm font-semibold">Select a news item to review details.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
              {filteredItems.map((item, idx) => (
                <div key={item.id} className="relative group">
                  {renderNewsCard(item, idx)}
                  {/* Detailed actions on grid view */}
                  <div className="flex items-center justify-end gap-2 mt-2 px-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDiscard(item.id);
                      }}
                      className="flex items-center space-x-1 text-red-650 hover:text-red-700 text-[10px] font-black py-1 px-2.5 rounded-md hover:bg-red-50 border border-slate-200 bg-white shadow-xs transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDispatchItem(item);
                      }}
                      className="flex items-center space-x-1 bg-[#0A2540] hover:bg-slate-800 text-white text-[10px] font-black py-1 px-3 rounded-md shadow-xs transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Dispatch</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "table" && (
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm bg-white pb-20">
              <table className="min-w-full divide-y divide-slate-250 text-left text-xs border-collapse">
                <thead className="bg-[#0A2540] text-white text-[10px] tracking-wider uppercase">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-center w-10 border-r border-slate-700">
                      <input 
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedItemIds.size === filteredItems.length}
                        onChange={toggleSelectAll}
                        className="rounded border-slate-700 text-[#0A2540] focus:ring-[#0A2540] cursor-pointer w-4 h-4 align-middle"
                      />
                    </th>
                    <th scope="col" className="px-3 py-3 font-extrabold text-center w-12 border-r border-slate-700">Sr. No</th>
                    <th scope="col" className="px-3 py-3 font-extrabold text-center w-16 border-r border-slate-700">Date</th>
                    <th scope="col" className="px-4 py-3 font-extrabold w-32 border-r border-slate-700">Ward/Area Concerned</th>
                    <th scope="col" className="px-4 py-3 font-extrabold w-36 border-r border-slate-700">Branch</th>
                    <th scope="col" className="px-4 py-3 font-extrabold border-r border-slate-700">Issue</th>
                    <th scope="col" className="px-4 py-3 font-extrabold w-48 border-r border-slate-700">Suggested Action</th>
                    <th scope="col" className="px-3 py-3 font-extrabold text-center w-20 border-r border-slate-705">Source</th>
                    <th scope="col" className="px-4 py-3 font-extrabold text-center w-32">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.map((item, index) => {
                    const isDispatched = dispatchedIds.has(item.id);
                    const isExpanded = expandedItems.has(item.id);
                    const isMonsoon = isMonsoonRelated(item);
                    const details = getSummaryDetails(item);
                    
                    let severityDot = "bg-slate-400";
                    let rowClass = "hover:bg-slate-50/50";
                    
                    if (isMonsoon) {
                      severityDot = "bg-red-655 animate-pulse";
                      rowClass = "bg-rose-50/50 hover:bg-rose-100/50";
                    } else if (item.severity === "High") {
                      severityDot = "bg-red-500 animate-pulse";
                      rowClass = "bg-red-50/5 hover:bg-red-50/10";
                    } else if (item.severity === "Medium") {
                      severityDot = "bg-amber-500";
                    }

                    if (isExpanded) {
                      rowClass += isMonsoon ? " bg-rose-100/70" : " bg-blue-50/15";
                    }
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr 
                          onClick={() => toggleItemExpand(item.id)}
                          className={`transition-all duration-350 cursor-pointer ${rowClass} ${isDispatched ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-3.5 text-center border-r border-slate-100 w-10" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox"
                              checked={selectedItemIds.has(item.id)}
                              onChange={(e) => toggleSelectItem(item.id, e as any)}
                              className="rounded border-slate-300 text-[#0A2540] focus:ring-[#0A2540] cursor-pointer w-4 h-4 align-middle"
                            />
                          </td>

                          {/* Sr. No */}
                          <td className="px-3 py-3.5 text-center font-bold text-slate-500 relative border-r border-slate-100">
                            {(item.severity === "High" || isMonsoon) && (
                              <div className={`absolute left-0 top-0 bottom-0 w-1 ${isMonsoon ? "bg-red-655" : "bg-red-500"}`} />
                            )}
                            <div className="flex items-center justify-center space-x-1.5">
                              {isExpanded ? (
                                <ChevronUp className={`w-3.5 h-3.5 ${isMonsoon ? "text-red-700" : "text-[#0A2540]"} shrink-0`} />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 shrink-0" />
                              )}
                              <span className={`w-2 h-2 rounded-full shrink-0 ${severityDot}`} title={`Severity: ${item.severity}${isMonsoon ? ' (Monsoon Priority)' : ''}`} />
                              <span>{index + 1}</span>
                            </div>
                          </td>
                          
                          {/* Date */}
                          <td className="px-3 py-3.5 text-center text-slate-600 whitespace-nowrap font-medium border-r border-slate-100">
                            {formatDate(item.created_at || selectedDate)}
                          </td>
                          
                          {/* Ward/Area Concerned */}
                          <td className="px-4 py-3.5 font-bold text-slate-800 break-words border-r border-slate-100 text-[11px]">
                            {details.where}
                          </td>
                          
                          {/* Branch */}
                          <td className="px-4 py-3.5 whitespace-normal border-r border-slate-100">
                            <div className="space-y-1">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block ${DEPT_STYLES[item.department] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                                {item.department}
                              </span>
                              <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                Assignee: <span className="text-[#0A2540]">{item.suggested_officer?.short_code || "JC (V)"}</span>
                              </div>
                            </div>
                          </td>
                          
                          {/* Issue */}
                          <td className="px-4 py-3.5 border-r border-slate-100 align-top">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-extrabold text-slate-800 text-[12px] leading-snug">{item.headline}</span>
                                {isMonsoon && (
                                  <span className="bg-red-100 text-red-700 text-[8.5px] font-black px-2 py-0.5 rounded-full inline-flex items-center border border-red-200 uppercase tracking-wider shrink-0 select-none animate-pulse">
                                    ☔ Monsoon
                                  </span>
                                )}
                              </div>
                              <div className={`text-slate-500 text-[11px] leading-relaxed ${isExpanded ? "" : "line-clamp-3"}`} title={details.what}>{details.what}</div>
                            </div>
                          </td>
                          
                          {/* Suggested Action */}
                          <td className="px-4 py-3.5 text-slate-655 border-r border-slate-100 align-top">
                            <div className={`text-[11px] leading-relaxed font-semibold ${isExpanded ? "" : "line-clamp-3"}`}>
                              {details.next_steps}
                            </div>
                          </td>
                          
                          {/* Source */}
                          <td className="px-3 py-3.5 text-center text-slate-500 font-bold whitespace-nowrap border-r border-slate-100">
                            <div>{item.publication}</div>
                            <div className="text-[9px] text-slate-450 mt-0.5 font-medium">Page {item.page_number}</div>
                          </td>
                          
                          {/* Actions */}
                          <td className="px-4 py-3.5 text-center align-middle">
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDiscard(item.id);
                                }}
                                className="w-full sm:w-auto flex items-center justify-center space-x-1 bg-white hover:bg-red-50 text-red-655 hover:text-red-700 text-[10px] font-black px-2.5 py-1.5 rounded-md border border-red-200 transition-colors shadow-sm"
                                title="Discard complaints"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Discard</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDispatchItem(item);
                                }}
                                className="w-full sm:w-auto flex items-center justify-center space-x-1 bg-[#0A2540] hover:bg-slate-800 text-white text-[10px] font-black px-2.5 py-1.5 rounded-md transition-colors shadow-sm"
                                title="Dispatch complaints"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Dispatch</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Collapsible expanded detail row */}
                        {isExpanded && !isDispatched && (
                          <tr className="bg-slate-50/40 transition-all duration-300">
                            <td colSpan={9} className="px-6 py-4 border-b border-slate-200">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs" onClick={(e) => e.stopPropagation()}>
                                {/* Full Text Column */}
                                <div className="lg:col-span-2 space-y-2">
                                  <h5 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider text-[#0A2540]">Full Article Text</h5>
                                  <p className="text-slate-655 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-wrap text-[11px] font-medium max-h-60 overflow-y-auto shadow-xs">
                                    {item.body || details.what}
                                  </p>
                                </div>
                                
                                {/* Metadata & Summary details */}
                                <div className="space-y-4">
                                  <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3 shadow-xs">
                                    <h5 className="font-extrabold text-[#0A2540] text-[11px] uppercase tracking-wider">Grievance Intelligence</h5>
                                    
                                    <div className="space-y-0.5">
                                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">📅 Occurrence Date / Time</span>
                                      <p className="text-slate-800 font-semibold text-[11px]">{details.when}</p>
                                    </div>
                                    
                                    <div className="space-y-0.5 border-t border-slate-100 pt-2">
                                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">📍 Ward / Location</span>
                                      <p className="text-slate-800 font-bold text-[11px]">{details.where}</p>
                                    </div>
                                    
                                    <div className="space-y-0.5 border-t border-slate-100 pt-2">
                                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">⚠️ Severity Rating</span>
                                      <p className="text-slate-800 font-bold flex items-center space-x-1.5 text-[11px]">
                                        <span className={`w-2 h-2 rounded-full ${item.severity === "High" ? "bg-red-500 animate-pulse" : item.severity === "Medium" ? "bg-amber-500" : "bg-slate-400"}`} />
                                        <span>{item.severity} Priority</span>
                                      </p>
                                    </div>
                                    
                                    <div className="space-y-0.5 border-t border-slate-100 pt-2">
                                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">💡 Directives / Suggested Action</span>
                                      <p className="text-slate-700 font-semibold leading-relaxed text-[11px] bg-amber-55/5 p-2 rounded border border-amber-100">{details.next_steps}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Dispatch modal trigger */}
      {activeDispatchItem && (
        <DispatchModal
          newsItem={activeDispatchItem}
          officers={officers}
          onClose={() => setActiveDispatchItem(null)}
          onDispatchSuccess={handleDispatchSuccess}
        />
      )}

      {/* Floating Bulk Action Bar */}
      {selectedItemIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl px-6 py-3 rounded-2xl flex items-center space-x-6 z-40 animate-fade-in ring-1 ring-black/5">
          <div className="text-slate-800 text-xs font-bold whitespace-nowrap">
            Selected <span className="text-[#0A2540] font-black text-sm">{selectedItemIds.size}</span> items
          </div>
          
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Assignee select */}
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Assign to:</span>
              <select
                value={bulkOfficerId}
                onChange={(e) => setBulkOfficerId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer font-bold shadow-sm"
              >
                <option value="suggested">Suggested Officers (Auto)</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.short_code} — {o.full_name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Remarks */}
            <input
              type="text"
              placeholder="Directives / remarks for all..."
              value={bulkRemarks}
              onChange={(e) => setBulkRemarks(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0A2540] focus:bg-white w-52 font-medium shadow-sm"
            />

            {/* Bulk Discard */}
            <button
              onClick={handleBulkDiscard}
              className="bg-white hover:bg-red-50 text-red-650 hover:text-red-700 text-xs font-black px-3.5 py-1.5 rounded-lg border border-red-200 transition-colors shadow-sm"
            >
              Discard Selected
            </button>

            {/* Bulk Dispatch Button */}
            <button
              onClick={handleBulkDispatch}
              className="bg-[#0A2540] hover:bg-slate-850 text-white text-xs font-black px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Selected</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
