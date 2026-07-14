import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Send, CheckCircle2, Clipboard } from "lucide-react";

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

interface NewsItem {
  id: string;
  headline: string;
  body: string;
  publication: string;
  department: string;
  severity: string;
  summary: string | any;
  page_number: number;
  suggested_officer?: Officer | null;
}

interface DispatchModalProps {
  newsItem: NewsItem;
  officers: Officer[];
  onClose: () => void;
  onDispatchSuccess: (newsItemId: string) => void;
}

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

const DEFAULT_SUGGESTION_MAP: Record<string, string> = {
  "Operations & Maintenance (O&M)": "SE (O&M)",
  "Bridges & Roads (B&R)": "SE (B&R)",
  "Town Planning (Building Branch)": "MTP",
  "Tehbazari / Land & Encroachment": "JC (V)",
  "Legal Cell": "JC (V)",
  "Sanitation & Vector Control": "JC (A)",
  "Solid Waste Management (SWM)": "JC (A)",
  "Health Branch": "JC (A)",
  "Horticulture / Parks & Squares": "JC (A)",
  "Property Tax / House Tax Branch": "JC (T)",
  "Licensing & Health License Branch": "JC (T)",
  "Accounts & Finance": "JC (T)",
  "Establishment & General Branch": "JC (T)",
  "Public Grievance Redressal / IT Cell": "JC (V)",
  "Fire Brigade & Emergency Services": "JC (V)"
};

export default function DispatchModal({ newsItem, officers, onClose, onDispatchSuccess }: DispatchModalProps) {
  const [step, setStep] = useState(1);
  const [department, setDepartment] = useState(newsItem.department);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([]);
  const [remarks, setRemarks] = useState(() => {
    if (newsItem.summary && typeof newsItem.summary === "object") {
      return newsItem.summary.next_steps || "";
    }
    return "";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [dispatchResults, setDispatchResults] = useState<{
    dispatches: {
      dispatch_id: string;
      officer_short_code: string;
      officer_name: string;
      message_text: string;
    }[];
    message_text: string;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const suggestedCode = DEFAULT_SUGGESTION_MAP[department] || "JC (V)";
    const suggestedOfficer = officers.find(o => o.short_code === suggestedCode);
    if (suggestedOfficer) {
      setSelectedOfficerIds([suggestedOfficer.id]);
    } else {
      setSelectedOfficerIds([]);
    }
  }, [department, officers]);

  const handleToggleOfficer = (id: string) => {
    setSelectedOfficerIds(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const jointCommissioners = officers.filter(o => o.officer_type === "joint_commissioner");
  const zonalCommissioners = officers.filter(o => o.officer_type === "zonal_commissioner");
  const superintendingEngineers = officers.filter(o => o.officer_type === "superintending_engineer");

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleConfirmDispatch = async () => {
    setIsSubmitting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/dispatch/${newsItem.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          officer_ids: selectedOfficerIds,
          remarks: remarks
        })
      });

      if (!response.ok) {
        throw new Error("Failed to dispatch item");
      }

      const result = await response.json();
      setWhatsappResult(result.message_text);
      setDispatchResults(result);
      setActiveMessageIndex(0);
      setStep(4);
    } catch (error) {
      alert("Error dispatching item. Please check backend is running.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Tri-color top stripe for Modal */}
        <div className="w-full h-1 flex shrink-0">
          <div className="flex-1 bg-[#FF671F]" />
          <div className="flex-1 bg-[#FFFFFF]" />
          <div className="flex-1 bg-[#046A38]" />
        </div>

        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0A2540] text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-400">Dispatch Registry Panel</h2>
            <p className="text-[10px] text-slate-350 truncate max-w-xs mt-0.5">{newsItem.headline}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Indicator */}
        {step < 4 && (
          <div className="px-6 pt-4 flex items-center justify-between text-[10px] font-bold text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold ${step >= 1 ? "bg-[#0A2540] text-white" : "bg-slate-100"}`}>1</span>
              <span className={step === 1 ? "text-[#0A2540] font-black" : ""}>Department</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200 flex-1 mx-2" />
            <div className="flex items-center space-x-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold ${step >= 2 ? "bg-[#0A2540] text-white" : "bg-slate-100"}`}>2</span>
              <span className={step === 2 ? "text-[#0A2540] font-black" : ""}>Assign</span>
            </div>
            <div className="h-0.5 w-8 bg-slate-200 flex-1 mx-2" />
            <div className="flex items-center space-x-1.5">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-extrabold ${step >= 3 ? "bg-[#0A2540] text-white" : "bg-slate-100"}`}>3</span>
              <span className={step === 3 ? "text-[#0A2540] font-black" : ""}>Remarks</span>
            </div>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* STEP 1: Department Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Step 1: Review or change the classified department
              </label>
              <div className="relative">
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:border-[#0A2540] text-xs appearance-none cursor-pointer font-bold"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                Gemini automatically classified this article. Changing the department updates the pre-selected Suggested Officer based on department mappings.
              </p>
            </div>
          )}

          {/* STEP 2: Assign To Officer */}
          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Step 2: Assign Officers (Select one or more)
              </label>
              
              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {/* Joint Commissioners */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0A2540] mb-2">Joint Commissioners</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {jointCommissioners.map(o => (
                      <label
                        key={o.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all duration-150 ${
                          selectedOfficerIds.includes(o.id)
                            ? "border-[#0A2540] bg-[#0A2540]/5 text-[#0A2540] font-semibold"
                            : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedOfficerIds.includes(o.id)}
                            onChange={() => handleToggleOfficer(o.id)}
                            className="text-[#0A2540] focus:ring-[#0A2540] accent-[#0A2540] rounded border-slate-300"
                          />
                          <div>
                            <span className="font-bold text-slate-800">{o.short_code}</span>
                            <span className="mx-2 text-slate-350">•</span>
                            <span>{o.full_name}</span>
                          </div>
                        </div>
                        {DEFAULT_SUGGESTION_MAP[department] === o.short_code && (
                          <span className="text-[9px] bg-amber-500 text-[#0A2540] font-black uppercase px-1.5 py-0.5 rounded">Suggested</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Zonal Commissioners */}
                {zonalCommissioners.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0A2540] mb-2">Zonal Commissioners</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {zonalCommissioners.map(o => (
                        <label
                          key={o.id}
                          className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all duration-150 ${
                            selectedOfficerIds.includes(o.id)
                              ? "border-[#0A2540] bg-[#0A2540]/5 text-[#0A2540] font-semibold"
                              : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <input
                              type="checkbox"
                              checked={selectedOfficerIds.includes(o.id)}
                              onChange={() => handleToggleOfficer(o.id)}
                              className="text-[#0A2540] focus:ring-[#0A2540] accent-[#0A2540] rounded border-slate-300"
                            />
                            <div className="truncate">
                              <span className="font-bold text-slate-800 block">{o.short_code}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">Zone {o.zone}</span>
                            </div>
                          </div>
                          {DEFAULT_SUGGESTION_MAP[department] === o.short_code && (
                            <span className="text-[9px] bg-amber-500 text-[#0A2540] font-black uppercase px-1.5 py-0.5 rounded shrink-0">Suggested</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Superintending Engineers */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-[#0A2540] mb-2">Superintending Engineers</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {superintendingEngineers.map(o => (
                      <label
                        key={o.id}
                        className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer transition-all duration-150 ${
                          selectedOfficerIds.includes(o.id)
                            ? "border-[#0A2540] bg-[#0A2540]/5 text-[#0A2540] font-semibold"
                            : "border-slate-200 bg-white text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedOfficerIds.includes(o.id)}
                            onChange={() => handleToggleOfficer(o.id)}
                            className="text-[#0A2540] focus:ring-[#0A2540] accent-[#0A2540] rounded border-slate-300"
                          />
                          <div>
                            <span className="font-bold text-slate-800">{o.full_name}</span>
                            <span className="mx-2 text-slate-350">•</span>
                            <span className="text-[11px] font-medium text-slate-500">{o.designation} ({o.short_code})</span>
                          </div>
                        </div>
                        {DEFAULT_SUGGESTION_MAP[department] === o.short_code && (
                          <span className="text-[9px] bg-amber-500 text-[#0A2540] font-black uppercase px-1.5 py-0.5 rounded">Suggested</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Remarks */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Step 3: Add Commissioner's Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add specific instructions, target deadlines, or details here..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 focus:outline-none focus:border-[#0A2540] text-xs placeholder:text-slate-400 font-semibold"
              />
              {selectedOfficerIds.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-[11px]">
                  <p className="font-bold text-[#0A2540]">Dispatching To ({selectedOfficerIds.length} Officers):</p>
                  <div className="divide-y divide-slate-200 max-h-40 overflow-y-auto pr-1">
                    {selectedOfficerIds.map(oid => {
                      const officer = officers.find(o => o.id === oid);
                      if (!officer) return null;
                      return (
                        <div key={oid} className="py-1.5 first:pt-0">
                          <p className="font-bold text-slate-800">{officer.full_name} ({officer.short_code})</p>
                          <p className="text-slate-500 font-medium">{officer.designation} • {officer.whatsapp_number || "No WhatsApp number"}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: Success & WhatsApp message preview */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in text-center py-4">
              <div className="flex justify-center">
                <CheckCircle2 className="w-14 h-14 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">Dispatched Successfully</h3>
                <p className="text-[11px] text-slate-500 mt-1 font-semibold">The dispatch record has been saved and the WhatsApp intelligence briefing is ready.</p>
              </div>

              {dispatchResults && (
                <div className="text-left space-y-2.5">
                  {dispatchResults.dispatches.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
                      {dispatchResults.dispatches.map((d, idx) => (
                        <button
                          key={d.dispatch_id}
                          onClick={() => setActiveMessageIndex(idx)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all duration-150 ${
                            activeMessageIndex === idx
                              ? "bg-[#0A2540] text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {d.officer_short_code}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center px-1">
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">
                      {dispatchResults.dispatches.length > 1
                        ? `WhatsApp Briefing for ${dispatchResults.dispatches[activeMessageIndex].officer_short_code}`
                        : "WhatsApp Message Preview"
                      }
                    </span>
                    <button
                      onClick={() => {
                        const txt = dispatchResults.dispatches.length > 1
                          ? dispatchResults.dispatches[activeMessageIndex].message_text
                          : whatsappResult;
                        if (txt) {
                          navigator.clipboard.writeText(txt);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }
                      }}
                      className="flex items-center space-x-1.5 text-[10px] text-emerald-800 hover:text-emerald-950 font-bold transition-colors bg-emerald-50 border border-emerald-250 px-2.5 py-1 rounded-md"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>{copied ? "Copied!" : "Copy Briefing"}</span>
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg font-mono text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap select-all max-h-52 overflow-y-auto">
                    {dispatchResults.dispatches.length > 1
                      ? dispatchResults.dispatches[activeMessageIndex].message_text
                      : whatsappResult
                    }
                  </div>

                  {dispatchResults.dispatches.length > 1 && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(dispatchResults.message_text);
                          alert("All briefings copied to clipboard!");
                        }}
                        className="text-[10px] font-bold text-[#0A2540] hover:underline"
                      >
                        Copy All Briefings Concatenated
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => onDispatchSuccess(newsItem.id)}
                  className="w-full bg-[#0A2540] hover:bg-slate-850 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center space-x-2 text-xs shadow-sm"
                >
                  <span>Close & Return to Desk</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {step < 4 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between shrink-0">
            <button
              onClick={handleBack}
              disabled={step === 1}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                step === 1
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                disabled={step === 2 && selectedOfficerIds.length === 0}
                className="flex items-center space-x-1 bg-[#0A2540] hover:bg-slate-850 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleConfirmDispatch}
                disabled={isSubmitting}
                className="flex items-center space-x-2 bg-[#0A2540] hover:bg-slate-850 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm Dispatch</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
