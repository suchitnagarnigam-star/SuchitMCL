import React, { useState, useEffect, useRef } from "react";
import { FileUp, HelpCircle, Check, Loader2, AlertCircle, FileText, ArrowRight } from "lucide-react";

interface UploadTabProps {
  onNavigation: (tab: string) => void;
  file: File | null;
  status: "idle" | "uploading" | "processing" | "completed" | "failed";
  uploadId: string | null;
  currentStep: "uploading" | "ocr_processing" | "analysing" | "completed" | "failed";
  totalPages: number;
  itemsExtracted: number;
  progressLog: string[];
  errorMessage: string;
  triggerUpload: (file: File, customDate?: string) => void;
  handleReset: () => void;
}

export default function UploadTab({
  onNavigation,
  file,
  status,
  uploadId,
  currentStep,
  totalPages,
  itemsExtracted,
  progressLog,
  errorMessage,
  triggerUpload,
  handleReset
}: UploadTabProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Offset local timezone date representation
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000));
    return localToday.toISOString().split("T")[0];
  });
  const logTerminalEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logTerminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [progressLog]);

  // Drag handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf" || droppedFile.name.toLowerCase().endsWith(".pdf")) {
        triggerUpload(droppedFile, selectedDate);
      } else {
        alert("Please drop a PDF document only.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      triggerUpload(selectedFile, selectedDate);
    }
  };


  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {status === "idle" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-[#0A2540] uppercase tracking-wider">News Publication Date</h4>
              <p className="text-[11px] text-slate-500 font-medium">Select the date corresponding to the newspaper cuttings being uploaded</p>
            </div>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-55 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg focus:ring-amber-500 focus:border-amber-500 p-2.5 shadow-sm w-full sm:w-44 cursor-pointer outline-none transition-all"
            />
          </div>
        </div>
      )}

      {/* Drag & Drop Area / Stepper Progress Display */}
      {status === "idle" ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center space-y-4 min-h-[300px] ${
            dragActive
              ? "border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10"
              : "border-slate-200 bg-white hover:border-[#0A2540]/40 hover:bg-slate-50/50"
          }`}
        >
          <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200">
            <FileUp className="w-8 h-8 text-[#0A2540]" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Drag and drop scanned PDF file here</p>
            <p className="text-xs text-slate-500">Supports up to 50MB PDFs</p>
          </div>

          <div>
            <label className="bg-[#0A2540] hover:bg-slate-850 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer inline-block shadow-md shadow-slate-900/10">
              Browse PDF File
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        /* In-progress processing states */
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {/* Header file details */}
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#0A2540]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 truncate max-w-xs">{file?.name}</p>
                <p className="text-[10px] text-slate-550 font-medium">
                  {totalPages > 0 ? `${totalPages} Pages` : "Calculating pages..."}
                </p>
              </div>
            </div>
            
            {status === "failed" && (
              <button
                onClick={handleReset}
                className="bg-slate-55 hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Reset Upload
              </button>
            )}
          </div>

          {/* Dynamic 4-Step Stepper Display */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {/* Step 1: Upload */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${
                  status === "uploading" ? "bg-[#0A2540] border-[#0A2540] text-white animate-pulse" : "bg-emerald-600 border-emerald-600 text-white"
                }`}>
                  {status === "uploading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-[10px] sm:text-xs">1. PDF Uploaded</p>
            </div>

            {/* Step 2: OCR */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${
                  currentStep === "ocr_processing"
                    ? "bg-[#0A2540] border-[#0A2540] text-white animate-pulse"
                    : currentStep === "analysing" || currentStep === "completed"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-500 font-semibold"
                }`}>
                  {currentStep === "ocr_processing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentStep === "analysing" || currentStep === "completed" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>2</span>
                  )}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-[10px] sm:text-xs">2. OCR Processing</p>
            </div>

            {/* Step 3: Analysis */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${
                  currentStep === "analysing"
                    ? "bg-[#0A2540] border-[#0A2540] text-white animate-pulse"
                    : currentStep === "completed"
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-500 font-semibold"
                }`}>
                  {currentStep === "analysing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : currentStep === "completed" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>3</span>
                  )}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-[10px] sm:text-xs">3. AI Analysis</p>
            </div>

            {/* Step 4: Completed */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs border ${
                  status === "completed"
                    ? "bg-emerald-600 border-emerald-600 text-white animate-bounce"
                    : status === "failed"
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-500 font-semibold"
                }`}>
                  {status === "completed" ? (
                    <Check className="w-4 h-4" />
                  ) : status === "failed" ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <span>4</span>
                  )}
                </div>
              </div>
              <p className="font-bold text-slate-800 text-[10px] sm:text-xs">4. Completed</p>
            </div>
          </div>

          {/* Success Banner or Error Banner */}
          {status === "completed" && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
              <div className="space-y-1">
                <p className="font-bold text-sm">Processing Completed!</p>
                <p>Extracted and classified {itemsExtracted} news items across {totalPages} pages.</p>
              </div>
              <button
                onClick={() => onNavigation("desk")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <span>View on Desk</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {status === "failed" && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-1 text-xs text-red-800 animate-pulse">
              <p className="font-bold text-sm">Job Failed</p>
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Terminal-style live logs */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Live Processing Console</p>
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg font-mono text-[10px] leading-relaxed text-slate-400 max-h-48 overflow-y-auto space-y-1 scroll-smooth select-all">
              {progressLog.map((log, index) => (
                <div key={index} className="flex space-x-2">
                  <span className="text-slate-650 font-semibold">[{new Date().toLocaleTimeString("en-IN")}]</span>
                  <span className={log.includes("completed") || log.includes("success") ? "text-emerald-400" : log.includes("Error") || log.includes("failed") ? "text-red-400 animate-pulse" : "text-slate-350"}>
                    {log}
                  </span>
                </div>
              ))}
              <div ref={logTerminalEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
