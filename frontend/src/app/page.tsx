"use client";

import React, { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/sidebar";
import DeskTab from "@/components/desk-tab";
import UploadTab from "@/components/upload-tab";
import OverviewTab from "@/components/overview-tab";
import MappingTab from "@/components/mapping-tab";
import ResolvedTab from "@/components/resolved-tab";
import DispatchedTab from "@/components/dispatched-tab";
import GovTopHeader from "@/components/gov-header";

interface Officer {
  id: string;
  short_code: string;
  full_name: string;
  designation: string;
  officer_type: string;
  zone?: string | null;
  department?: string | null;
  whatsapp_number: string;
  is_active: boolean;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("overview");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);

  // Lifted Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "processing" | "completed" | "failed">("idle");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadStep, setUploadStep] = useState<"uploading" | "ocr_processing" | "analysing" | "completed" | "failed">("uploading");
  const [uploadTotalPages, setUploadTotalPages] = useState(0);
  const [uploadItemsExtracted, setUploadItemsExtracted] = useState(0);
  const [uploadProgressLog, setUploadProgressLog] = useState<string[]>([]);
  const [uploadErrorMessage, setUploadErrorMessage] = useState("");

  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  const startPolling = (id: string) => {
    if (pollingInterval.current) clearInterval(pollingInterval.current);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    pollingInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${apiUrl}/processing-status/${id}`);
        if (!res.ok) {
          if (res.status === 444) {
            throw new Error("Job not found on server.");
          }
          throw new Error("Polling error.");
        }

        const data = await res.json();
        
        setUploadTotalPages(data.total_pages);
        setUploadItemsExtracted(data.items_extracted);
        setUploadProgressLog(data.progress_log || []);
        
        if (data.status === "completed") {
          setUploadStatus("completed");
          setUploadStep("completed");
          if (pollingInterval.current) clearInterval(pollingInterval.current);
        } else if (data.status === "failed") {
          setUploadStatus("failed");
          setUploadStep("failed");
          setUploadErrorMessage("Pipeline processing crashed. Check logs below.");
          if (pollingInterval.current) clearInterval(pollingInterval.current);
        } else {
          setUploadStep(data.status);
        }
      } catch (err: any) {
        console.error(err);
        setUploadStatus("failed");
        setUploadErrorMessage(err.message || "Error polling status.");
        if (pollingInterval.current) clearInterval(pollingInterval.current);
      }
    }, 3000);
  };

  const triggerUpload = async (pdfFile: File) => {
    setUploadFile(pdfFile);
    setUploadStatus("uploading");
    setUploadErrorMessage("");
    setUploadProgressLog(["Uploading PDF to Supabase Storage..."]);
    
    const formData = new FormData();
    formData.append("file", pdfFile);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/upload-pdf`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload request failed: ${response.statusText}`);
      }

      const result = await response.json();
      setUploadId(result.upload_id);
      setUploadStatus("processing");
      setUploadStep("ocr_processing");
      setUploadProgressLog(prev => [...prev, "File upload complete. Registered background job ID: " + result.upload_id]);
      
      startPolling(result.upload_id);
    } catch (err: any) {
      console.error(err);
      setUploadStatus("failed");
      setUploadErrorMessage(err.message || "Failed to initiate PDF upload.");
      setUploadProgressLog(prev => [...prev, "Error uploading file: " + (err.message || "Unknown error")]);
    }
  };

  const handleResetUpload = () => {
    setUploadFile(null);
    setUploadStatus("idle");
    setUploadId(null);
    setUploadStep("uploading");
    setUploadTotalPages(0);
    setUploadItemsExtracted(0);
    setUploadProgressLog([]);
    setUploadErrorMessage("");
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const fetchOfficers = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/officers`);
      if (!res.ok) throw new Error("Failed to fetch officers");
      const data = await res.json();
      
      // Flatten grouped response
      const flatList: Officer[] = [
        ...(data.joint_commissioner || []),
        ...(data.zonal_commissioner || []),
        ...(data.superintending_engineer || [])
      ];
      
      setOfficers(flatList);
    } catch (err) {
      console.error("Error loading officers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfficers();
    
    // Cleanup polling on unmount of the entire app
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Official Government Top Header Bar */}
      <GovTopHeader />

      {/* Main Workspace Body */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Sidebar Nav */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content Pane */}
        <main id="main-content" className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
          {/* Workspace Context Bar */}
          <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 pb-4 pt-4 px-5 gap-4 bg-white rounded-xl shadow-sm border-l-4 border-l-[#0A2540]">
            <div>
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest block">
                Workspace Panel
              </span>
              <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-none mt-1">
                {activeTab === "overview" && "Executive Overview Dashboard"}
                {activeTab === "desk" && "Commissioner's Action Desk"}
                {activeTab === "mapping" && "Department & Officer Mapping Panel"}
                {activeTab === "dispatched" && "Dispatched Intelligence Log"}
                {activeTab === "resolved" && "Transparency & Resolution Register"}
                {activeTab === "upload" && "Daily Newspaper PDF Ingestion"}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5">
                Active Session: Commissioner Office Control Room • Ludhiana, Punjab
              </p>
            </div>
            <div className="flex items-center space-x-3 self-end sm:self-auto text-xs">
              <div className="bg-emerald-50 text-emerald-800 font-bold px-3 py-1.5 rounded-lg border border-emerald-150 flex items-center space-x-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>System Live</span>
              </div>
            </div>
          </header>

        {/* Tab Switcher rendering */}
        {loading && officers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-primaryBlue rounded-full animate-spin" />
            <p className="text-sm text-textSecondary">Connecting to Suchit Nagar Nigam services...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === "overview" && (
              <OverviewTab />
            )}

            {activeTab === "desk" && (
              <DeskTab officers={officers} />
            )}
            
            {activeTab === "mapping" && (
              <MappingTab />
            )}

            {activeTab === "dispatched" && (
              <DispatchedTab officers={officers} />
            )}
            
            {activeTab === "resolved" && (
              <ResolvedTab officers={officers} />
            )}
            
            {activeTab === "upload" && (
              <UploadTab 
                onNavigation={(tab) => setActiveTab(tab)}
                file={uploadFile}
                status={uploadStatus}
                uploadId={uploadId}
                currentStep={uploadStep}
                totalPages={uploadTotalPages}
                itemsExtracted={uploadItemsExtracted}
                progressLog={uploadProgressLog}
                errorMessage={uploadErrorMessage}
                triggerUpload={triggerUpload}
                handleReset={handleResetUpload}
              />
            )}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
