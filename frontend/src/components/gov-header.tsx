import React, { useState, useEffect } from "react";
import { PunjabGovEmblem, SwachhBharatLogo, DigitalIndiaLogo, MCLLogo } from "./gov-assets";
import { Shield, Eye, Calendar, Sparkles } from "lucide-react";

export default function GovTopHeader() {
  const [currentDate, setCurrentDate] = useState("");
  const [contrastMode, setContrastMode] = useState("normal");

  useEffect(() => {
    const timer = setInterval(() => {
      const today = new Date();
      setCurrentDate(today.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-white border-b border-slate-200 shadow-sm relative z-40 select-none">
      {/* 1. Indian Flag Tri-color Strip at the very top */}
      <div className="w-full h-1 flex">
        <div className="flex-1 bg-[#FF671F]" /> {/* Saffron */}
        <div className="flex-1 bg-[#FFFFFF]" /> {/* White */}
        <div className="flex-1 bg-[#046A38]" /> {/* Green */}
      </div>

      {/* 2. Top Accessibility & Meta Info Bar (Slate Gray) */}
      <div className="w-full bg-slate-900 text-slate-300 text-[10px] md:text-xs py-1.5 px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-800">
        {/* Left: Punjab Government/Ludhiana text */}
        <div className="flex items-center space-x-2.5 divide-x divide-slate-700">
          <span className="font-semibold text-slate-100 tracking-wide uppercase">
            ਪੰਜਾਬ ਸਰਕਾਰ | Government of Punjab
          </span>
          <span className="pl-2.5 text-slate-300 font-medium">
            ਨਗਰ ਨਿਗਮ ਲੁਧਿਆਣਾ | Municipal Corporation Ludhiana
          </span>
        </div>

        {/* Right: Accessibility Controls & Live Clock */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-1.5 text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-mono text-[10px]">{currentDate}</span>
          </div>

          <div className="flex items-center space-x-3.5 font-bold">
            {/* Font resizing helpers */}
            <div className="flex items-center space-x-1 border-l border-slate-700 pl-3.5">
              <button 
                onClick={() => document.documentElement.style.fontSize = "14px"}
                className="hover:text-white px-1" title="Decrease Text Size"
              >
                A-
              </button>
              <button 
                onClick={() => document.documentElement.style.fontSize = "16px"}
                className="hover:text-white px-1 border-x border-slate-800" title="Normal Text Size"
              >
                A
              </button>
              <button 
                onClick={() => document.documentElement.style.fontSize = "18px"}
                className="hover:text-white px-1" title="Increase Text Size"
              >
                A+
              </button>
            </div>

            {/* Screen Reader and Language */}
            <div className="flex items-center space-x-2 border-l border-slate-700 pl-3.5">
              <span className="bg-slate-800 text-amber-500 font-black px-1.5 py-0.5 rounded text-[8px] tracking-wider border border-slate-700 flex items-center">
                <Shield className="w-2.5 h-2.5 mr-0.5" />
                SECURE
              </span>
              <span className="text-slate-400 font-semibold">Language:</span>
              <span className="text-amber-500 cursor-pointer hover:text-amber-400">ENG</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Government Portal Banner */}
      <div className="w-full py-4 px-4 md:px-8 bg-gradient-to-r from-white via-slate-50/50 to-white flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Left Section: MCL Logo & Title */}
        <div className="flex items-center space-x-4 text-center md:text-left">
          <MCLLogo className="w-16 h-16 md:w-20 md:h-20 drop-shadow-sm shrink-0" />
          
          <div className="border-l border-slate-200 pl-4 py-0.5 space-y-0.5">
            <span className="text-[10px] font-extrabold tracking-widest text-[#FF671F] uppercase block leading-none">
              COMMISSIONER'S CONTROL DESK
            </span>
            <h1 className="text-xl md:text-2xl font-black text-[#0A2540] tracking-tight leading-none">
              ਸੁਚਿਤ ਨਗਰ ਨਿਗਮ
            </h1>
            <h2 className="text-xs md:text-sm font-bold text-slate-700 tracking-tight leading-none mt-1">
              Suchit Nagar Nigam — Municipal Corporation Ludhiana
            </h2>
            <p className="text-[10px] md:text-xs text-[#046A38] font-bold tracking-wider uppercase mt-1 flex items-center justify-center md:justify-start">
              <span>Media Intelligence & Dispatch Registry</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2 animate-ping" />
            </p>
          </div>
        </div>

        {/* Right Section: Swachh Bharat & Digital India Logos */}
        <div className="flex flex-wrap items-center justify-center gap-5 md:gap-6 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
          <SwachhBharatLogo className="h-10 md:h-12" />
          <DigitalIndiaLogo className="h-9 md:h-11 hidden sm:block" />
        </div>
      </div>

      {/* 4. Sub-banner: Administrative Office Ribbon */}
      <div className="w-full bg-[#0A2540] text-amber-400 py-1.5 px-4 md:px-8 flex justify-between items-center text-xs font-bold border-t border-amber-500/20">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="tracking-wide">MCL MEDIA MONITORING CELL</span>
        </div>
        <div className="hidden md:flex items-center space-x-1.5 text-slate-300">
          <span>Official Portal for Internal Administration</span>
          <span className="text-amber-500 font-extrabold">v2.1</span>
        </div>
      </div>
    </header>
  );
}
