import React, { useState, useEffect } from "react";
import { ShieldCheck, Search, Clock, FileText, ExternalLink, HelpCircle, RefreshCw, User, Clipboard } from "lucide-react";
import { DEPT_STYLES } from "./desk-tab";

interface Officer {
  id: string;
  short_code: string;
  full_name: string;
  designation: string;
  officer_type: string;
  whatsapp_number: string;
}

interface Evidence {
  id: string;
  file_type: string;
  file_url: string;
  file_name: string;
}

interface DispatchDetails {
  remarks?: string | null;
}

interface ResolvedItem {
  id: string;
  headline: string;
  body: string;
  publication: string;
  department: string;
  severity: string;
  summary: string | any;
  page_number: number;
  status: string;
  action_taken_description: string;
  resolved_at: string;
  dispatched_at: string;
  time_taken_days: number;
  officer?: Officer | null;
  evidence?: Evidence[];
  dispatch_details?: DispatchDetails | null;
}

interface ResolvedTabProps {
  officers: Officer[];
}

export default function ResolvedTab({ officers }: ResolvedTabProps) {
  const [resolvedItems, setResolvedItems] = useState<ResolvedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchResolved = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let url = `${apiUrl}/resolved?`;
      if (selectedDept) url += `department=${encodeURIComponent(selectedDept)}&`;
      if (selectedOfficerId) url += `officer_id=${selectedOfficerId}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load resolved registry");
      const data = await res.json();
      setResolvedItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResolved();
  }, [selectedDept, selectedOfficerId, searchQuery]);

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black text-[#0A2540] flex items-center">
            <ShieldCheck className="w-5.5 h-5.5 text-emerald-600 mr-2 shrink-0" />
            Resolved Issues Registry
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Transparency & accountability archive: All media grievances resolved with official action taken reports.
          </p>
        </div>
        <button
          onClick={fetchResolved}
          className="flex items-center space-x-1.5 bg-[#0A2540] hover:bg-slate-850 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Registry</span>
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm border-t-2 border-t-[#0A2540]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Keyword Search */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Search Headline / Action</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0A2540] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Department</label>
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-[#0A2540] focus:bg-white transition-colors cursor-pointer font-semibold"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Officer Filter */}
          <div>
            <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[9px]">Assigned Officer</label>
            <select
              value={selectedOfficerId}
              onChange={e => setSelectedOfficerId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-[#0A2540] focus:bg-white transition-colors cursor-pointer font-semibold"
            >
              <option value="">All Officers</option>
              {officers.map(o => (
                <option key={o.id} value={o.id}>{o.short_code} — {o.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resolved table layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0A2540] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading resolved register...</p>
        </div>
      ) : resolvedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
          <HelpCircle className="w-12 h-12 text-slate-400" />
          <div>
            <h3 className="text-base font-bold text-slate-800">No Resolved Items Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no records in the resolved archive matching current filters.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#0A2540] border-b border-slate-800 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  <th className="py-4 px-6 w-16 text-center">Sr. No</th>
                  <th className="py-4 px-6 w-80">Article Title</th>
                  <th className="py-4 px-6 w-96">Action Taken Report</th>
                  <th className="py-4 px-6 w-32 text-center">Time Taken</th>
                  <th className="py-4 px-6 w-60">Officer Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {resolvedItems.map((item, idx) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/40 odd:bg-white even:bg-slate-50/20 transition-colors align-top">
                      {/* Sr No */}
                      <td className="py-4 px-6 font-bold text-slate-400 text-center">{idx + 1}</td>
                      
                      {/* Article Title */}
                      <td className="py-4 px-6 space-y-2">
                        <p className="font-bold text-slate-850 leading-snug">{item.headline}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${DEPT_STYLES[item.department] || "bg-slate-100 text-slate-600"}`}>
                            {item.department}
                          </span>
                          <span className="text-[9px] text-slate-450 font-medium">
                            Dispatched: {formatDate(item.dispatched_at)}
                          </span>
                        </div>
                      </td>

                      {/* Action Taken Report & Evidence */}
                      <td className="py-4 px-6 space-y-3">
                        <p className="text-slate-650 leading-relaxed font-semibold bg-slate-50/50 p-2.5 rounded-lg border border-slate-150/70">
                          {item.action_taken_description}
                        </p>
                        
                        {/* Evidence stack */}
                        {item.evidence && item.evidence.length > 0 ? (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-550 block">Verified Evidence</span>
                            <div className="flex flex-wrap gap-2">
                              {item.evidence.map((ev, index) => (
                                <a
                                  key={ev.id}
                                  href={ev.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center space-x-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50/30 border border-emerald-500 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors"
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Evidence #{index + 1} ({ev.file_type === "photo" ? "Photo" : "PDF"})</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No evidence attached</span>
                        )}
                      </td>

                      {/* Time Taken */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center space-x-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{item.time_taken_days} {item.time_taken_days === 1 ? "Day" : "Days"}</span>
                        </div>
                      </td>

                      {/* Officer Remarks */}
                      <td className="py-4 px-6 space-y-1.5">
                        {item.officer ? (
                          <div>
                            <p className="font-bold text-slate-800">{item.officer.full_name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{item.officer.designation} ({item.officer.short_code})</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                        {item.dispatch_details?.remarks ? (
                          <p className="text-[10px] text-slate-500 italic leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                            "{item.dispatch_details.remarks}"
                          </p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">
                            No remarks
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
