import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, FileSpreadsheet, Search, Calendar, Filter, Clipboard, AlertCircle } from "lucide-react";
import { DEPT_STYLES } from "./desk-tab";

interface Officer {
  id: string;
  short_code: string;
  full_name: string;
  designation: string;
  officer_type: string;
  zone?: string | null;
  department?: string | null;
  whatsapp_number: string;
  is_active?: boolean;
}

interface NewsItem {
  id: string;
  headline: string;
  body: string;
  publication: string;
  department: string;
  severity: string;
  summary: string | any;
  page_number: number;
}

interface DispatchRecord {
  id: string;
  news_item_id: string;
  officer_id: string;
  dispatched_by: string;
  dispatched_at: string;
  remarks: string | null;
  whatsapp_status: string;
  message_text: string;
  news_item: NewsItem;
  officer: Officer;
}

interface DispatchedTabProps {
  officers: Officer[];
}

export default function DispatchedTab({ officers }: DispatchedTabProps) {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Accordion Expand states
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Clipboard copy tracker
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const DEPARTMENTS = [
    "Operations & Maintenance (O&M)",
    "Bridges & Roads (B&R)",
    "Horticulture / Parks & Squares",
    "Solid Waste Management (SWM)",
    "Sanitation & Vector Control",
    "Health Branch",
    "Town Planning (Building Branch)",
    "Tehbazari / Land & Encroachment",
    "Licensing & Health License Branch",
    "Property Tax / House Tax Branch",
    "Accounts & Finance",
    "Establishment & General Branch",
    "Legal Cell",
    "Public Grievance Redressal / IT Cell",
    "Fire Brigade & Emergency Services"
  ];

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let url = `${apiUrl}/dispatched?`;
      if (selectedOfficerId) url += `officer_id=${selectedOfficerId}&`;
      if (selectedDept) url += `department=${encodeURIComponent(selectedDept)}&`;
      if (dateFrom) url += `date_from=${dateFrom}&`;
      if (dateTo) url += `date_to=${dateTo}&`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch dispatch logs");
      const data = await res.json();
      setDispatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, [selectedOfficerId, selectedDept, dateFrom, dateTo]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // CSV Export utility
  const exportToCSV = () => {
    if (dispatches.length === 0) return;

    // Headers
    const headers = [
      "Headline",
      "Publication",
      "Department",
      "Severity",
      "Page Number",
      "Assigned Officer",
      "Officer Designation",
      "WhatsApp Number",
      "Dispatched At",
      "Remarks"
    ];

    const rows = dispatches.map(d => [
      `"${d.news_item.headline.replace(/"/g, '""')}"`,
      `"${d.news_item.publication.replace(/"/g, '""')}"`,
      `"${d.news_item.department}"`,
      `"${d.news_item.severity}"`,
      d.news_item.page_number,
      `"${d.officer.full_name} (${d.officer.short_code})"`,
      `"${d.officer.designation}"`,
      `"${d.officer.whatsapp_number}"`,
      `"${d.dispatched_at}"`,
      `"${(d.remarks || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Suchit_Nagar_Nigam_Dispatches_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Date String helper (yyyy-mm-ddThh:mm... -> 30 Jun 2026, 04:30 PM)
  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top filter and actions block */}
      <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm border-t-2 border-t-[#0A2540] space-y-4">
        <div className="flex items-center space-x-2 text-xs font-black text-[#0A2540] uppercase tracking-wider">
          <Filter className="w-4 h-4 text-amber-600" />
          <span>Filter Dispatched logs</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Officer Selector */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Assigned Officer</label>
            <select
              value={selectedOfficerId}
              onChange={e => setSelectedOfficerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer font-semibold"
            >
              <option value="">All Officers</option>
              {officers.map(o => (
                <option key={o.id} value={o.id}>
                  {o.short_code} — {o.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Department</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer font-semibold"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">From Date</label>
            <div className="relative">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer font-semibold"
              />
            </div>
          </div>

          {/* Date To */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">To Date</label>
            <div className="relative">
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-[#0A2540] cursor-pointer font-semibold"
              />
            </div>
          </div>

          {/* Export to CSV Button */}
          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              disabled={dispatches.length === 0}
              className={`w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                dispatches.length === 0
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV ({dispatches.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main table log list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0A2540] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading dispatch records...</p>
        </div>
      ) : dispatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-xl space-y-4">
          <AlertCircle className="w-12 h-12 text-slate-400" />
          <div>
            <h3 className="text-base font-bold text-slate-800">No Dispatches Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no records in the dispatch register matching current filters.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map(record => {
            const isExpanded = expandedId === record.id;
            const isCopied = copiedId === record.id;

            // Severity styling
            let severityBadge = "bg-green-500/10 text-green-400 border border-green-500/20";
            if (record.news_item.severity === "High") {
              severityBadge = "bg-red-500/20 text-red-500 border border-red-500/30";
            } else if (record.news_item.severity === "Medium") {
              severityBadge = "bg-amber-500/20 text-amber-600 border border-amber-500/30";
            }

            return (
              <div
                key={record.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:border-[#0A2540]/30 shadow-sm"
              >
                {/* Accordion clickable header row */}
                <button
                  onClick={() => toggleExpand(record.id)}
                  className="w-full text-left p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Department Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${DEPT_STYLES[record.news_item.department] || "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                        {record.news_item.department}
                      </span>
                      {/* Severity */}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-extrabold ${severityBadge}`}>
                        {record.news_item.severity}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 leading-snug line-clamp-1">
                      {record.news_item.headline}
                    </h4>
                  </div>

                  {/* Right side metadata */}
                  <div className="flex items-center space-x-6 text-xs text-slate-500 shrink-0">
                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-extrabold">Assigned Officer</span>
                      <span className="font-black text-[#0A2540]">{record.officer.full_name}</span>
                    </div>

                    <div>
                      <span className="block text-[9px] text-slate-400 uppercase font-extrabold">Dispatched Date</span>
                      <span className="font-semibold text-slate-600">{formatDateTime(record.dispatched_at)}</span>
                    </div>

                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded details container */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-150/70 bg-slate-50/30 grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
                    <div className="space-y-4">
                      {/* Summary Section */}
                      <div>
                        <h5 className="text-[10px] font-bold text-[#0A2540] uppercase tracking-wider mb-1">Executive Summary</h5>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 p-3.5 rounded-lg">
                          {typeof record.news_item.summary === "object" && record.news_item.summary !== null
                            ? (record.news_item.summary.what || "Not specified")
                            : record.news_item.summary}
                        </p>
                      </div>

                      {/* Remarks Section */}
                      <div>
                        <h5 className="text-[10px] font-bold text-[#0A2540] uppercase tracking-wider mb-1">Commissioner's Remarks</h5>
                        <p className="text-xs text-slate-750 leading-relaxed bg-white border border-slate-200 p-3.5 rounded-lg italic">
                          {record.remarks ? record.remarks : "No additional remarks provided."}
                        </p>
                      </div>

                      {/* Officer Details */}
                      <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{record.officer.full_name}</p>
                          <p className="text-slate-500 font-medium">{record.officer.designation}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 font-semibold uppercase text-[8px]">WhatsApp Contact</p>
                          <p className="font-bold text-[#0A2540] mt-0.5">{record.officer.whatsapp_number}</p>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp bubble on the right */}
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <h5 className="text-[10px] font-bold text-[#0A2540] uppercase tracking-wider">Dispatched WhatsApp Text</h5>
                        <button
                          onClick={() => copyMessage(record.id, record.message_text)}
                          className="flex items-center space-x-1.5 text-[10px] text-emerald-800 hover:text-emerald-900 font-bold transition-colors bg-emerald-50 border border-emerald-250 px-2.5 py-1 rounded-md"
                        >
                          <Clipboard className="w-3.5 h-3.5" />
                          <span>{isCopied ? "Copied!" : "Copy Text"}</span>
                        </button>
                      </div>
                      
                      <div className="bg-white border border-slate-200 p-4 rounded-lg font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap select-all flex-1 max-h-60 overflow-y-auto">
                        {record.message_text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
