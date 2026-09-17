"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  X, Printer, Download, FileSpreadsheet, FileText, 
  Calendar, User, Filter, CheckCircle2, Building2, 
  RefreshCw, ChevronDown, ExternalLink
} from "lucide-react";

interface OfficerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

interface DispatchRecord {
  id: string;
  news_item_id: string;
  officer_id: string;
  dispatched_at: string;
  remarks?: string;
  news_item?: {
    id: string;
    headline: string;
    body?: string;
    department: string;
    severity: string;
    publication: string;
    page_number?: number;
    summary?: any;
    status: string;
    created_at?: string;
  };
  officer?: {
    id: string;
    short_code: string;
    full_name: string;
    designation: string;
    whatsapp_number?: string;
  };
}

export default function OfficerReportModal({
  isOpen,
  onClose,
  initialDate
}: OfficerReportModalProps) {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Date and filter controls
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [dateScope, setDateScope] = useState<"today" | "yesterday" | "custom" | "all">("today");
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("all");

  // Fetch dispatches when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchDispatches = async () => {
      setLoading(true);
      setError("");
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/dispatched`);
        if (!res.ok) throw new Error("Failed to load dispatches");
        const data = await res.json();
        setDispatches(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Error fetching dispatches for report:", err);
        setError("Failed to load dispatches from server.");
      } finally {
        setLoading(false);
      }
    };

    fetchDispatches();
  }, [isOpen]);

  // Adjust selectedDate when quick scope buttons are clicked
  const handleScopeChange = (scope: "today" | "yesterday" | "custom" | "all") => {
    setDateScope(scope);
    if (scope === "today") {
      setSelectedDate(todayStr);
    } else if (scope === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setSelectedDate(y.toISOString().slice(0, 10));
    }
  };

  // Extract clean text fields for a news item
  const getItemDetails = (d: DispatchRecord) => {
    const news = d.news_item || ({} as any);
    const summary = news.summary || {};

    let summaryText = "Not specified";
    if (typeof summary === "object" && summary !== null) {
      summaryText = summary.what || summary.description || news.body || "Grievance details reported for action.";
    } else if (typeof summary === "string" && summary.trim()) {
      summaryText = summary;
    } else if (news.body) {
      summaryText = news.body;
    }

    // Sender Information
    let senderInfo = "Citizen Complaint";
    const isDaak = summary.source_type === "daak" || news.publication?.toLowerCase().includes("daak");
    if (isDaak) {
      const parts: string[] = [];
      if (summary.sender_name) parts.push(summary.sender_name);
      if (summary.sender_contact) parts.push(`Contact: ${summary.sender_contact}`);
      if (summary.serial_number) parts.push(`Serial: ${summary.serial_number}`);
      else if (summary.diary_no) parts.push(`Ref: ${summary.diary_no}`);
      senderInfo = parts.length > 0 ? parts.join(" | ") : "Citizen Daak / Email Grievance";
    } else {
      const locality = summary.where && summary.where !== "Not specified" ? summary.where : "";
      senderInfo = locality ? `Locality: ${locality}` : "Public Media Report";
      if (news.page_number) {
        senderInfo += ` (p. ${news.page_number})`;
      }
    }

    // Source
    let source = news.publication || "Press Media";
    if (isDaak) {
      source = "Citizen Daak (Email/Physical)";
    }

    return {
      department: news.department || "Operations & Maintenance (O&M)",
      subject: news.headline || "Civic Grievance",
      summary: summaryText,
      senderInfo,
      source,
      severity: news.severity || "Medium",
      dispatchedAt: d.dispatched_at || news.created_at || ""
    };
  };

  // Filter records based on selected date and officer
  const filteredDispatches = useMemo(() => {
    return dispatches.filter(d => {
      const dt = (d.dispatched_at || d.news_item?.created_at || "").slice(0, 10);
      
      if (dateScope !== "all") {
        if (selectedDate && dt !== selectedDate) return false;
      }

      if (selectedOfficerId !== "all" && d.officer?.id !== selectedOfficerId) {
        return false;
      }

      return true;
    });
  }, [dispatches, dateScope, selectedDate, selectedOfficerId]);

  // Group filtered records by officer
  const groupedByOfficer = useMemo(() => {
    const map = new Map<string, { officer: any; items: Array<{ record: DispatchRecord; details: ReturnType<typeof getItemDetails> }> }>();

    filteredDispatches.forEach(d => {
      const off = d.officer || {
        id: "unassigned",
        full_name: "Unassigned Officer",
        short_code: "Unassigned",
        designation: "N/A"
      };

      if (!map.has(off.id)) {
        map.set(off.id, { officer: off, items: [] });
      }

      map.get(off.id)!.items.push({
        record: d,
        details: getItemDetails(d)
      });
    });

    return Array.from(map.values()).sort((a, b) => {
      return a.officer.full_name.localeCompare(b.officer.full_name);
    });
  }, [filteredDispatches]);

  // List of all unique officers from the overall dispatch dataset for the dropdown
  const allOfficersList = useMemo(() => {
    const map = new Map<string, any>();
    dispatches.forEach(d => {
      if (d.officer?.id) {
        map.set(d.officer.id, d.officer);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [dispatches]);

  // Total items count across grouped officers
  const totalReportItems = useMemo(() => {
    return groupedByOfficer.reduce((acc, curr) => acc + curr.items.length, 0);
  }, [groupedByOfficer]);

  // --- EXPORT 1: PRINT / PDF ---
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to generate the printable report.");
      return;
    }

    const dateDisplay = dateScope === "all" 
      ? "All Historical Active Grievances" 
      : new Date(selectedDate + "T00:00:00").toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });

    let officersHtml = "";
    if (groupedByOfficer.length === 0) {
      officersHtml = `
        <div style="text-align:center; padding:50px 20px; color:#64748b; font-family:Arial, sans-serif;">
          <h3>No grievances dispatched for ${dateDisplay}.</h3>
          <p>Please select another date or choose 'All Active Dispatches'.</p>
        </div>
      `;
    } else {
      groupedByOfficer.forEach(group => {
        const off = group.officer;
        const rows = group.items.map((item, idx) => `
          <tr>
            <td style="border:1px solid #cbd5e1; padding:8px; text-align:center; font-weight:bold; width:45px;">${idx + 1}</td>
            <td style="border:1px solid #cbd5e1; padding:8px; font-weight:600; font-size:11px; width:130px;">${item.details.department}</td>
            <td style="border:1px solid #cbd5e1; padding:8px; font-weight:700; font-size:11.5px; width:220px; color:#0f172a;">${item.details.subject}</td>
            <td style="border:1px solid #cbd5e1; padding:8px; font-size:11px; line-height:1.45; color:#334155;">${item.details.summary}</td>
            <td style="border:1px solid #cbd5e1; padding:8px; font-size:10.5px; width:160px; color:#475569;">${item.details.senderInfo}</td>
            <td style="border:1px solid #cbd5e1; padding:8px; font-size:10.5px; width:120px; font-weight:600; color:#0369a1;">${item.details.source}</td>
          </tr>
        `).join("");

        officersHtml += `
          <div class="officer-section" style="page-break-inside: avoid; margin-bottom: 28px;">
            <div style="background-color: #f1f5f9; border-left: 6px solid #0a2540; padding: 10px 14px; margin-bottom: 8px; border-radius: 4px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h2 style="margin: 0; font-size: 15px; color: #0a2540; font-weight: 800;">
                  Name of officer = ${off.full_name} (${off.short_code})
                </h2>
                <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                  Designation: <strong>${off.designation || "Assigned Officer"}</strong>
                  ${off.whatsapp_number ? ` &bull; Contact: ${off.whatsapp_number}` : ""}
                </div>
              </div>
              <div style="background: #0a2540; color: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                ${group.items.length} Grievance${group.items.length === 1 ? "" : "s"}
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; margin-bottom: 12px;">
              <thead>
                <tr style="background-color: #0a2540; color: #ffffff;">
                  <th style="border:1px solid #0a2540; padding:8px; text-align:center;">Sr. no</th>
                  <th style="border:1px solid #0a2540; padding:8px; text-align:left;">Department</th>
                  <th style="border:1px solid #0a2540; padding:8px; text-align:left;">Subject</th>
                  <th style="border:1px solid #0a2540; padding:8px; text-align:left;">Summary</th>
                  <th style="border:1px solid #0a2540; padding:8px; text-align:left;">Sender Information</th>
                  <th style="border:1px solid #0a2540; padding:8px; text-align:left;">Source</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MCL Officer Grievance Report - ${dateDisplay}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 12mm;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 10px;
            background: #fff;
          }
          .header-box {
            text-align: center;
            border-bottom: 2px solid #0a2540;
            padding-bottom: 12px;
            margin-bottom: 18px;
          }
          .header-box h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 900;
            color: #0a2540;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-box p {
            margin: 3px 0 0 0;
            font-size: 11.5px;
            color: #475569;
          }
          .meta-bar {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: bold;
            color: #334155;
            margin-bottom: 18px;
            border-radius: 4px;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            .officer-section { page-break-after: auto; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom:15px; display:flex; gap:10px; justify-content:flex-end;">
          <button onclick="window.print()" style="background:#0a2540; color:#fff; border:none; padding:8px 16px; border-radius:4px; font-weight:bold; cursor:pointer;">
            🖨️ Print / Save as PDF
          </button>
          <button onclick="window.close()" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:8px 16px; border-radius:4px; font-weight:bold; cursor:pointer;">
            Close
          </button>
        </div>

        <div class="header-box">
          <div style="font-size: 10px; font-weight: 800; color: #d97706; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px;">
            Municipal Corporation Ludhiana &bull; Commissioner's Grievance Monitoring Cell
          </div>
          <h1>Officer-Wise Daily Grievance Action Report</h1>
          <p>Daily Redressal Dossier of Citizen Grievances & Media Reports Marked to Municipal Officers</p>
        </div>

        <div class="meta-bar">
          <span>📅 <strong>Report Date:</strong> ${dateDisplay}</span>
          <span>🏛️ <strong>Total Officers with Tasks:</strong> ${groupedByOfficer.length}</span>
          <span>📋 <strong>Total Grievances:</strong> ${totalReportItems}</span>
          <span>⏰ <strong>Generated:</strong> ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        ${officersHtml}

        <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 9.5px; color: #64748b; text-align: center;">
          Confidential &bull; Municipal Corporation Ludhiana &bull; Suchit Nagar Nigam Intelligence Platform
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  // --- EXPORT 2: CSV SPREADSHEET ---
  const handleDownloadCSV = () => {
    if (groupedByOfficer.length === 0) {
      alert("No grievances found to export for the selected date.");
      return;
    }

    const lines: string[] = [];
    lines.push(`"MUNICIPAL CORPORATION LUDHIANA — DAILY OFFICER GRIEVANCE REPORT"`);
    lines.push(`"Report Date: ${dateScope === "all" ? "All Time" : selectedDate}"`);
    lines.push(`"Generated At: ${new Date().toLocaleString("en-IN")}"`);
    lines.push("");

    groupedByOfficer.forEach(group => {
      const off = group.officer;
      lines.push(`"Name of officer = ${off.full_name} (${off.short_code}) - ${off.designation || ''}"`);
      lines.push(`"Sr. no","Department","Subject","Summary","Sender Information","Source"`);

      group.items.forEach((it, idx) => {
        const cleanSr = `"${idx + 1}"`;
        const cleanDept = `"${(it.details.department || '').replace(/"/g, '""')}"`;
        const cleanSubj = `"${(it.details.subject || '').replace(/"/g, '""')}"`;
        const cleanSumm = `"${(it.details.summary || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
        const cleanSender = `"${(it.details.senderInfo || '').replace(/"/g, '""')}"`;
        const cleanSource = `"${(it.details.source || '').replace(/"/g, '""')}"`;
        lines.push([cleanSr, cleanDept, cleanSubj, cleanSumm, cleanSender, cleanSource].join(","));
      });

      lines.push(""); // Blank line between officers
    });

    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MCL_Officer_Grievance_Report_${selectedDate || "all"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- EXPORT 3: MICROSOFT WORD (.DOC) ---
  const handleDownloadDoc = () => {
    if (groupedByOfficer.length === 0) {
      alert("No grievances found to export for the selected date.");
      return;
    }

    const dateDisplay = dateScope === "all" ? "All Active Grievances" : selectedDate;

    let officerSectionsHtml = "";
    groupedByOfficer.forEach(group => {
      const off = group.officer;
      const rows = group.items.map((it, idx) => `
        <tr>
          <td style="border:1px solid #94a3b8; padding:6px; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #94a3b8; padding:6px; font-weight:bold;">${it.details.department}</td>
          <td style="border:1px solid #94a3b8; padding:6px; font-weight:bold; color:#0a2540;">${it.details.subject}</td>
          <td style="border:1px solid #94a3b8; padding:6px;">${it.details.summary}</td>
          <td style="border:1px solid #94a3b8; padding:6px;">${it.details.senderInfo}</td>
          <td style="border:1px solid #94a3b8; padding:6px;">${it.details.source}</td>
        </tr>
      `).join("");

      officerSectionsHtml += `
        <div style="margin-top:20px; margin-bottom:15px;">
          <h3 style="background:#0a2540; color:#ffffff; padding:8px 12px; margin:0 0 5px 0; font-size:14px;">
            Name of officer = ${off.full_name} (${off.short_code}) &mdash; ${off.designation || "Assigned Officer"}
          </h3>
          <table style="width:100%; border-collapse:collapse; font-family:Arial, sans-serif; font-size:11px;" border="1">
            <thead>
              <tr style="background:#f1f5f9; color:#0a2540;">
                <th style="border:1px solid #94a3b8; padding:6px; width:45px;">Sr. no</th>
                <th style="border:1px solid #94a3b8; padding:6px; width:130px;">Department</th>
                <th style="border:1px solid #94a3b8; padding:6px; width:180px;">Subject</th>
                <th style="border:1px solid #94a3b8; padding:6px;">Summary</th>
                <th style="border:1px solid #94a3b8; padding:6px; width:150px;">Sender Information</th>
                <th style="border:1px solid #94a3b8; padding:6px; width:110px;">Source</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    });

    const docContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Officer Grievance Report</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="color:#0a2540; text-align:center; margin-bottom:4px;">Municipal Corporation Ludhiana</h1>
        <h2 style="color:#64748b; text-align:center; font-size:14px; margin-top:0;">Daily Officer Grievance Redressal Report</h2>
        <p style="text-align:center; font-size:12px; color:#334155;"><strong>Date:</strong> ${dateDisplay} &bull; <strong>Total Grievances:</strong> ${totalReportItems}</p>
        <hr style="border:1px solid #0a2540; margin-bottom:20px;">
        ${officerSectionsHtml}
      </body>
      </html>
    `;

    const blob = new Blob([docContent], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `MCL_Officer_Grievance_Report_${selectedDate || "all"}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-[#0A2540] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Daily Officer Grievance Redressal Report</h3>
              <p className="text-[11px] text-slate-300">
                Official tabular dossier grouped officer-by-officer with subjects, summaries & sender details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          
          {/* Date Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-600 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-[#0A2540]" />
              Date:
            </span>

            {/* Quick scope buttons */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-semibold shadow-2xs">
              <button
                onClick={() => handleScopeChange("today")}
                className={`px-2.5 py-1 rounded-md transition-all ${dateScope === "today" ? "bg-[#0A2540] text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                Today
              </button>
              <button
                onClick={() => handleScopeChange("yesterday")}
                className={`px-2.5 py-1 rounded-md transition-all ${dateScope === "yesterday" ? "bg-[#0A2540] text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateScope("custom")}
                className={`px-2.5 py-1 rounded-md transition-all ${dateScope === "custom" ? "bg-[#0A2540] text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                Custom Date
              </button>
              <button
                onClick={() => handleScopeChange("all")}
                className={`px-2.5 py-1 rounded-md transition-all ${dateScope === "all" ? "bg-[#0A2540] text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                All-Time
              </button>
            </div>

            {/* Custom Date Input */}
            {dateScope === "custom" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white font-medium focus:ring-1 focus:ring-[#0A2540] focus:outline-none"
              />
            )}
          </div>

          {/* Officer Selector Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-600 flex items-center">
              <User className="w-3.5 h-3.5 mr-1 text-[#0A2540]" />
              Officer:
            </span>
            <select
              value={selectedOfficerId}
              onChange={(e) => setSelectedOfficerId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium focus:ring-1 focus:ring-[#0A2540] focus:outline-none max-w-[220px]"
            >
              <option value="all">All Officers ({groupedByOfficer.length})</option>
              {allOfficersList.map(o => (
                <option key={o.id} value={o.id}>
                  {o.full_name} ({o.short_code})
                </option>
              ))}
            </select>
          </div>

          {/* Export Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={groupedByOfficer.length === 0}
              className="flex items-center space-x-1.5 bg-[#0A2540] hover:bg-slate-850 disabled:opacity-50 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Print official report or save directly as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              disabled={groupedByOfficer.length === 0}
              className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Download structured CSV spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel (CSV)</span>
            </button>

            <button
              onClick={handleDownloadDoc}
              disabled={groupedByOfficer.length === 0}
              className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Download Microsoft Word document"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Word (.doc)</span>
            </button>
          </div>
        </div>

        {/* Live Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70 space-y-6">
          
          {/* Summary Strip */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center space-x-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Selected Date</span>
                <span className="font-bold text-slate-800">
                  {dateScope === "all" ? "All Time" : selectedDate}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Active Officers</span>
                <span className="font-bold text-slate-800">{groupedByOfficer.length} Officers</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Dispatched Cases</span>
                <span className="font-bold text-red-600">{totalReportItems} Grievances</span>
              </div>
            </div>

            <span className="text-[11px] text-slate-500 italic">
              Live Preview of Downloadable Document
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-[#0A2540] mb-2" />
              <p className="text-xs font-bold">Compiling officer grievance dossiers...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 text-center">
              {error}
            </div>
          ) : groupedByOfficer.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-xl p-6">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">No Dispatched Grievances Found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No citizen grievances or media complaints were dispatched for <strong>{dateScope === "all" ? "the selected scope" : selectedDate}</strong>. Try selecting another date or switch to &apos;All-Time&apos;.
              </p>
            </div>
          ) : (
            groupedByOfficer.map((group, gIdx) => {
              const off = group.officer;
              return (
                <div key={off.id || gIdx} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  
                  {/* Officer Title Banner */}
                  <div className="bg-slate-50 border-b border-slate-200 p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-l-4 border-l-[#0A2540]">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-[#0A2540] uppercase tracking-wide">
                          Name of officer =
                        </span>
                        <h4 className="text-sm font-black text-[#0A2540]">
                          {off.full_name} ({off.short_code})
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {off.designation || "Municipal Officer"} {off.whatsapp_number && `• Contact: ${off.whatsapp_number}`}
                      </p>
                    </div>

                    <span className="text-xs font-bold bg-[#0A2540] text-white px-2.5 py-1 rounded-full self-start sm:self-auto">
                      {group.items.length} Grievance{group.items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {/* Tabular Form */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#0A2540]/5 text-[#0A2540] border-b border-slate-200 font-black text-[11px]">
                          <th className="py-2.5 px-3 text-center w-14">Sr. no</th>
                          <th className="py-2.5 px-3 w-44">Department</th>
                          <th className="py-2.5 px-3 w-64">Subject</th>
                          <th className="py-2.5 px-3">Summary</th>
                          <th className="py-2.5 px-3 w-48">Sender Information</th>
                          <th className="py-2.5 px-3 w-36">Source</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {group.items.map((item, idx) => {
                          const isUrgent = item.details.severity === "High";
                          return (
                            <tr key={item.record.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-800 block">
                                  {item.details.department}
                                </span>
                                {isUrgent && (
                                  <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-red-100 text-red-700">
                                    Urgent High
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-slate-900 leading-snug">
                                  {item.details.subject}
                                </p>
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-3 hover:line-clamp-none">
                                  {item.details.summary}
                                </p>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-slate-700 text-[10.5px] block font-medium">
                                  {item.details.senderInfo}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-sky-700 font-semibold text-[10.5px] block">
                                  {item.details.source}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Ready to export <strong>{totalReportItems}</strong> cases across <strong>{groupedByOfficer.length}</strong> officers.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
