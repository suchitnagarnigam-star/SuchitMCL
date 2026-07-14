import React, { useState, useEffect, useRef } from "react";
import { User, Calendar, FileText, CheckCircle2, ChevronRight, Upload, AlertCircle, Eye, ExternalLink, RefreshCw } from "lucide-react";
import { DEPT_STYLES } from "./desk-tab";

interface Evidence {
  id: string;
  file_type: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
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
  status: string; // dispatched / in_progress / resolved
  remarks?: string | null;
  dispatched_at?: string;
  action_taken_description?: string | null;
  evidence?: Evidence[];
}

interface ActiveOfficer {
  id: string;
  short_code: string;
  full_name: string;
  designation: string;
  officer_type: string;
  whatsapp_number: string;
  active_count: number;
  active_items: NewsItem[];
}

export default function MappingTab() {
  const [officers, setOfficers] = useState<ActiveOfficer[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Track draft state per news item for the action panel
  // itemId -> { status, description, isUploadingEvidence, uploadError }
  const [draftActions, setDraftActions] = useState<Record<string, { status: string; description: string; isDirty: boolean }>>({});
  
  // Track evidence upload loading status per item
  const [uploadingItemIds, setUploadingItemIds] = useState<Set<string>>(new Set());

  // Track items animating out
  const [fadingItemIds, setFadingItemIds] = useState<Set<string>>(new Set());

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fetchActiveOfficers = async (selectFirst = false) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/officer-mapping`);
      if (!res.ok) throw new Error("Failed to load officer mappings");
      const data = await res.json();
      setOfficers(data);

      if (data.length > 0) {
        if (selectFirst || !selectedOfficerId || !data.some((o: ActiveOfficer) => o.id === selectedOfficerId)) {
          setSelectedOfficerId(data[0].id);
        }
      } else {
        setSelectedOfficerId(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOfficers(true);
  }, []);

  // Initialize draft actions when active items change
  useEffect(() => {
    const drafts: Record<string, { status: string; description: string; isDirty: boolean }> = {};
    officers.forEach(off => {
      off.active_items.forEach(item => {
        drafts[item.id] = {
          status: item.status === "dispatched" ? "pending" : item.status === "in_progress" ? "in_progress" : "pending",
          description: item.action_taken_description || "",
          isDirty: false
        };
      });
    });
    setDraftActions(prev => ({ ...drafts, ...prev }));
  }, [officers]);

  // Group officers for Left List
  const jointCommissioners = officers.filter(o => o.officer_type === "joint_commissioner");
  const zonalCommissioners = officers.filter(o => o.officer_type === "zonal_commissioner");
  const superintendingEngineers = officers.filter(o => o.officer_type === "superintending_engineer");

  const getAvatarColors = (name: string) => {
    const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "bg-blue-100 text-blue-800 border-blue-200",
      "bg-purple-100 text-purple-800 border-purple-200",
      "bg-teal-100 text-teal-800 border-teal-200",
      "bg-indigo-100 text-indigo-800 border-indigo-200",
      "bg-emerald-100 text-emerald-800 border-emerald-200",
      "bg-rose-100 text-rose-800 border-rose-200"
    ];
    return colors[hash % colors.length];
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
  };

  // Handle draft field changes
  const handleDraftChange = (itemId: string, fields: Partial<{ status: string; description: string }>) => {
    setDraftActions(prev => {
      const current = prev[itemId] || { status: "pending", description: "", isDirty: false };
      return {
        ...prev,
        [itemId]: {
          ...current,
          ...fields,
          isDirty: true
        }
      };
    });
  };

  // Upload evidence trigger
  const handleFileUploadClick = (itemId: string) => {
    fileInputRefs.current[itemId]?.click();
  };

  const handleFileChange = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploadingItemIds(prev => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });

    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append("files", e.target.files[i]);
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/news-items/${itemId}/evidence`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Evidence upload failed");
      
      const data = await res.json();
      
      // Update local officers items state to attach evidence
      setOfficers(prev => prev.map(off => {
        return {
          ...off,
          active_items: off.active_items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                evidence: [...(item.evidence || []), ...data.uploaded_evidence]
              };
            }
            return item;
          })
        };
      }));
    } catch (err) {
      alert("Error attaching evidence file. Please verify file limit size.");
      console.error(err);
    } finally {
      setUploadingItemIds(prev => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  // Save Administrative Action Taken
  const handleSaveAction = async (itemId: string) => {
    const draft = draftActions[itemId];
    if (!draft) return;

    // Map frontend 'pending' label back to 'dispatched' backend enum state if selected as pending
    const backendStatus = draft.status === "pending" ? "dispatched" : draft.status;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/news-items/${itemId}/action`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: backendStatus,
          action_taken_description: draft.description
        })
      });

      if (!res.ok) throw new Error("Failed to save action");

      // Mark dirty flag off
      setDraftActions(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], isDirty: false }
      }));

      // If status is Resolved, trigger fade out animation
      if (backendStatus === "resolved") {
        setFadingItemIds(prev => {
          const next = new Set(prev);
          next.add(itemId);
          return next;
        });

        // Remove item from state after animation completes
        setTimeout(() => {
          setOfficers(prev => prev.map(off => {
            if (off.id === selectedOfficerId) {
              const updatedItems = off.active_items.filter(x => x.id !== itemId);
              return {
                ...off,
                active_items: updatedItems,
                active_count: updatedItems.length
              };
            }
            return off;
          }).filter(off => off.active_count > 0)); // Filter out officers with no active items

          setFadingItemIds(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
          
          // Re-sync mappings from DB to ensure counts are pristine
          fetchActiveOfficers(false);
        }, 500);
      } else {
        // Just reload mapping data to sync
        fetchActiveOfficers(false);
        alert("Action status updated successfully.");
      }
    } catch (err) {
      alert("Error updating action report.");
      console.error(err);
    }
  };

  const selectedOfficer = officers.find(o => o.id === selectedOfficerId);

  // Grouped officer rows renderer helper
  const renderOfficerListSection = (sectionTitle: string, officersSectionList: ActiveOfficer[]) => {
    if (officersSectionList.length === 0) return null;
    return (
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">{sectionTitle}</h4>
        <div className="space-y-1">
          {officersSectionList.map(o => {
            const isSelected = selectedOfficerId === o.id;
            const hasUrgent = o.active_items.some(x => x.severity === "High");

            return (
              <button
                key={o.id}
                onClick={() => setSelectedOfficerId(o.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-lg border text-left transition-all duration-150 ${
                  isSelected
                    ? "bg-[#0A2540]/5 border-l-4 border-l-[#0A2540] border-y-transparent border-r-transparent text-[#0A2540] font-bold shadow-sm"
                    : "bg-transparent border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColors(o.full_name)}`}>
                    {getInitials(o.full_name)}
                  </div>
                  <div className="truncate">
                    <span className="text-xs font-bold block leading-snug">{o.short_code}</span>
                    <span className="text-[10px] text-slate-500 truncate block">{o.full_name}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  {hasUrgent && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" title="Urgent Task pending" />
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? "bg-[#0A2540] text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {o.active_count}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform duration-150 ${
                    isSelected ? "text-[#0A2540] transform translate-x-0.5" : "text-slate-350"
                  }`} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-black text-[#0A2540]">Officer Mapping & Updates</h2>
          <p className="text-xs text-slate-500">Update administrative responses and verify evidence attachments on behalf of officers</p>
        </div>
        <button
          onClick={() => fetchActiveOfficers(false)}
          className="flex items-center space-x-1.5 bg-[#0A2540] hover:bg-slate-850 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Registry</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0A2540] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading mapping records...</p>
        </div>
      ) : officers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          <div>
            <h3 className="text-base font-bold text-slate-800">All Officer Tasks Clear</h3>
            <p className="text-xs text-slate-500 mt-1">There are no active dispatched or in-progress tasks currently assigned to officers.</p>
          </div>
        </div>
      ) : (
        /* Left/Right Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Officer List Card */}
          <div className="md:col-span-4 bg-white border border-slate-200 border-t-2 border-t-[#0A2540] rounded-xl p-4 shadow-sm space-y-5">
            <h3 className="text-[10px] font-bold text-[#0A2540] uppercase tracking-wider border-b border-slate-100 pb-2">Active Task Registry</h3>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {renderOfficerListSection("Joint Commissioners", jointCommissioners)}
              {renderOfficerListSection("Zonal Commissioners", zonalCommissioners)}
              {renderOfficerListSection("Superintending Engineers", superintendingEngineers)}
            </div>
          </div>

          {/* Right Column: Selected Officer's items */}
          <div className="md:col-span-8 space-y-4">
            {selectedOfficer && (
              <>
                {/* Officer Header Info Card */}
                <div className="bg-white border border-slate-200 border-l-4 border-l-amber-500 p-5 rounded-xl shadow-sm flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-black text-xs border ${getAvatarColors(selectedOfficer.full_name)}`}>
                      {getInitials(selectedOfficer.full_name)}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-[#0A2540]">{selectedOfficer.full_name}</h3>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">{selectedOfficer.designation} ({selectedOfficer.short_code})</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl font-black text-[#0A2540] block leading-none">{selectedOfficer.active_count}</span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mt-1">ITEMS</span>
                  </div>
                </div>

                {/* News Items list */}
                <div className="space-y-4">
                  {selectedOfficer.active_items.map(item => {
                    const isFading = fadingItemIds.has(item.id);
                    const draft = draftActions[item.id] || { status: "pending", description: "", isDirty: false };
                    const isUploading = uploadingItemIds.has(item.id);

                    // Severity styling
                    let severityLabel = "Low Severity";
                    let severityBadge = "bg-severity-lowBg text-severity-lowText";
                    if (item.severity === "High") {
                      severityLabel = "CRITICAL / HIGH";
                      severityBadge = "bg-severity-criticalBg text-severity-criticalText";
                    } else if (item.severity === "Medium") {
                      severityLabel = "Medium Severity";
                      severityBadge = "bg-severity-mediumBg text-severity-mediumText";
                    }

                    // Format date
                    const dispDate = item.dispatched_at 
                      ? new Date(item.dispatched_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                      : "Recently";

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-500 flex flex-col justify-between ${
                          item.severity === "High" ? "border-l-4 border-l-red-500" : ""
                        } ${
                          isFading ? "opacity-0 scale-95 translate-y-4 pointer-events-none" : "opacity-100 scale-100"
                        }`}
                      >
                        {/* News Item Card Details block */}
                        <div className="p-5 space-y-3.5">
                          {/* Card Subtitle */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-[10px]">
                            <span className="text-slate-500 font-bold flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              Dispatched: {dispDate} | Source: {item.publication}
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${DEPT_STYLES[item.department] || "bg-slate-100 text-slate-600"}`}>
                                {item.department}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${
                                item.status === "dispatched" || item.status === "pending"
                                  ? "bg-slate-100 text-slate-600 border border-slate-200"
                                  : item.status === "in_progress"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-250"
                              }`}>
                                {item.status === "dispatched" ? "PENDING" : item.status === "in_progress" ? "IN PROGRESS" : item.status.toUpperCase()}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider ${severityBadge}`}>
                                {severityLabel}
                              </span>
                            </div>
                          </div>

                          {/* Headline */}
                          <h4 className="text-xs font-bold text-slate-800 leading-snug">{item.headline}</h4>
                          
                          {/* Summary */}
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                            {typeof item.summary === "object" && item.summary !== null
                              ? (item.summary.what || "Not specified")
                              : item.summary}
                          </p>

                          {/* Remarks */}
                          {item.remarks && (
                            <div className="p-3 bg-slate-50 border border-slate-150 rounded-lg text-xs text-slate-600 italic">
                              <span className="font-bold text-[#0A2540] block not-italic text-[10px] uppercase tracking-wider mb-0.5">Commissioner's Remarks</span>
                              "{item.remarks}"
                            </div>
                          )}

                          {/* Uploaded Evidence Links */}
                          {item.evidence && item.evidence.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Evidence Attachments ({item.evidence.length})</span>
                              <div className="flex flex-wrap gap-1.5">
                                {item.evidence.map(ev => (
                                  <a
                                    key={ev.id}
                                    href={ev.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center space-x-1.5 text-[10px] font-bold text-[#0A2540] bg-slate-50 border border-slate-200 hover:bg-slate-100 px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="truncate max-w-[120px]">{ev.file_name}</span>
                                    <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ADMINISTRATIVE ACTION PANEL (Inline sub-panel) */}
                        <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Administrative Action report</span>
                            <span className="text-[9px] text-slate-400 italic">Update action description and evidence attachments</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Status dropdown */}
                            <div className="sm:col-span-1">
                              <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Task Status</label>
                              <select
                                value={draft.status}
                                onChange={e => handleDraftChange(item.id, { status: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-[#0A2540] font-bold focus:outline-none focus:border-[#0A2540] cursor-pointer"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </div>

                            {/* Evidence File Picker */}
                            <div className="sm:col-span-2 flex flex-col justify-end">
                              <input
                                type="file"
                                multiple
                                ref={el => { fileInputRefs.current[item.id] = el; }}
                                onChange={e => handleFileChange(item.id, e)}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => handleFileUploadClick(item.id)}
                                disabled={isUploading}
                                className="w-full bg-white hover:bg-slate-100 border border-[#0A2540] text-[#0A2540] text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
                              >
                                {isUploading ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-slate-100 border-t-[#0A2540] rounded-full animate-spin" />
                                    <span>Uploading files...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Attach Reports or Photos</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Description text area */}
                          <div>
                            <label className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Action Report details</label>
                            <textarea
                              value={draft.description}
                              onChange={e => handleDraftChange(item.id, { description: e.target.value })}
                              placeholder="Describe administrative actions taken, site inspections, resolved parameters, etc..."
                              rows={2}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#0A2540]"
                            />
                          </div>

                          {/* Action Button */}
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveAction(item.id)}
                              disabled={!draft.isDirty && item.status === (draft.status === "pending" ? "dispatched" : draft.status) && item.action_taken_description === draft.description}
                              className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm ${
                                !draft.isDirty && item.status === (draft.status === "pending" ? "dispatched" : draft.status) && item.action_taken_description === draft.description
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                                  : "bg-[#0A2540] hover:bg-slate-850 text-white"
                              }`}
                            >
                              Save Action
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
