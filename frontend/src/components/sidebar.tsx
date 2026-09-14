import React, { useEffect, useState } from "react";
import { LayoutDashboard, FileUp, ShieldCheck, BarChart3, Briefcase, FileSpreadsheet, LogIn, Users, Shield } from "lucide-react";
import { MCLLogo } from "./gov-assets";
import Link from "next/link";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("mcl_auth_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          setUserRole(parsed.role || null);
          setUserName(parsed.full_name || parsed.username || null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const menuItems = [
    { id: "overview", name: "Overview", icon: BarChart3 },
    { id: "desk", name: "Commissioner's Desk", icon: LayoutDashboard },
    { id: "mapping", name: "Officer Mapping", icon: Briefcase },
    { id: "dispatched", name: "Dispatched Items", icon: FileSpreadsheet },
    { id: "resolved", name: "Resolved", icon: ShieldCheck },
    { id: "upload", name: "Upload Daily PDF", icon: FileUp },
  ];

  // Dynamically add User Management only for superadmin
  if (userRole === "superadmin") {
    menuItems.push({ id: "users", name: "User Management", icon: Users });
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-sidebarBg text-white min-h-screen shrink-0 border-r border-slate-700">
        {/* Header Block */}
        <div className="p-6 border-b border-slate-700 flex items-center space-x-3">
          {/* Official MCL Circular Logo */}
          <MCLLogo className="w-12 h-12 shrink-0 bg-white rounded-full p-0.5 border border-amber-500/40" />
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight leading-tight">
              Suchit Nagar Nigam
            </h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">
              Media Intelligence
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isUsersTab = item.id === "users";
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 ${
                  isActive
                    ? isUsersTab
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-900/40"
                      : "bg-sidebarActiveBg text-sidebarBg shadow-md shadow-slate-900/10"
                    : isUsersTab
                    ? "text-purple-300 hover:text-white hover:bg-purple-900/40 border border-purple-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? (isUsersTab ? "text-white" : "text-sidebarBg") : (isUsersTab ? "text-purple-400" : "text-slate-400")}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Officer Login Link */}
        <div className="px-4 py-2 border-t border-slate-800">
          <Link
            href="/login"
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all duration-200"
          >
            <LogIn className="w-4 h-4 text-blue-400 group-hover:text-white" />
            <span>Officer Sign In</span>
          </Link>
        </div>

        {/* Footer in sidebar */}
        <div className="p-6 border-t border-slate-700 text-[10px] text-slate-400 space-y-1">
          <p className="font-semibold text-slate-200">Municipal Corporation Ludhiana</p>
          <p>Developed by Shivam Gulati</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebarBg border-t border-slate-700 px-1 py-1 flex justify-around shadow-2xl">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-200 ${
                isActive ? "text-blue-500 font-semibold" : "text-slate-400"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] tracking-tight">{item.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
