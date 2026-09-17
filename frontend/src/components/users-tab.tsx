"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, Shield, UserCheck, ShieldAlert, Trash2, Eye, EyeOff, Search, RefreshCw, KeyRound, Check, X, AlertCircle } from "lucide-react";

interface UserRecord {
  id: string;
  username: string;
  full_name: string;
  role: "superadmin" | "admin" | "officer" | string;
  is_active: boolean;
  created_at?: string;
}

export default function UsersTab() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formFullName, setFormFullName] = useState("");
  const [formRole, setFormRole] = useState<"superadmin" | "admin" | "officer">("admin");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/users`);
      if (!res.ok) throw new Error("Failed to load users database.");
      const data = await res.json();
      setUsers(data || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim() || !formPassword.trim() || !formFullName.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername.trim(),
          password: formPassword.trim(),
          full_name: formFullName.trim(),
          role: formRole,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to create user.");
      }

      const created = await res.json();
      setSuccessMsg(`User '${created.username}' created successfully!`);
      setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
      
      // Reset form & close modal
      setFormUsername("");
      setFormPassword("");
      setFormFullName("");
      setFormRole("admin");
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to create user account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserRecord) => {
    const updatedStatus = !user.is_active;
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: updatedStatus } : u))
    );

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: updatedStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status.");
      }
    } catch (err: any) {
      console.error(err);
      // Revert optimism on error
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u))
      );
      setError("Failed to update user active status.");
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/users/${userToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete user.");

      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setSuccessMsg(`User '@${userToDelete.username}' deleted successfully.`);
      setUserToDelete(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter((user) => {
    const matchSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === "all" || user.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Stats counters
  const totalCount = users.length;
  const superAdminCount = users.filter((u) => u.role === "superadmin").length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const officerCount = users.filter((u) => u.role === "officer").length;

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-700 font-bold text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0A2540] via-[#1E293B] to-[#0A2540] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
          <ShieldAlert className="w-64 h-64 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-purple-500/20 text-purple-200 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-purple-400/30 mb-2">
              <Shield className="w-3.5 h-3.5" />
              <span>Super Admin Authority Panel</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">System User Directory & Access Governance</h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Provision, manage, and grant access roles to Suchit Nagar Nigam portal operators and municipal officers.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="self-start md:self-auto bg-[#FF671F] hover:bg-[#E05610] text-white text-xs sm:text-sm font-extrabold px-5 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 group"
          >
            <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Users</div>
            <div className="text-xl font-extrabold text-slate-900">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-700">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Super Admins</div>
            <div className="text-xl font-extrabold text-purple-900">{superAdminCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Administrators</div>
            <div className="text-xl font-extrabold text-blue-900">{adminCount}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Officers</div>
            <div className="text-xl font-extrabold text-emerald-900">{officerCount}</div>
          </div>
        </div>
      </div>

      {/* Directory Filter & Control Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <span className="font-bold text-slate-500">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Roles ({totalCount})</option>
            <option value="superadmin">Super Admin ({superAdminCount})</option>
            <option value="admin">Admin ({adminCount})</option>
            <option value="officer">Officer ({officerCount})</option>
          </select>

          <button
            onClick={fetchUsers}
            title="Refresh Users List"
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-blue-100 border-t-[#2563EB] rounded-full animate-spin" />
            <p className="text-xs font-semibold text-slate-500">Loading user database records...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No users found</p>
            <p className="text-xs text-slate-400">Try adjusting your search or role filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">User Details</th>
                  <th className="py-3.5 px-4">Role / Access Level</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredUsers.map((user) => {
                  const isSuper = user.role === "superadmin";
                  const isAdmin = user.role === "admin";

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                            isSuper
                              ? "bg-purple-100 text-purple-700 border border-purple-200"
                              : isAdmin
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}>
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{user.full_name}</div>
                            <div className="text-xs font-mono text-slate-400">@{user.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {isSuper ? (
                          <span className="inline-flex items-center space-x-1 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full text-[11px] font-extrabold border border-purple-200">
                            <Shield className="w-3 h-3 text-purple-600" />
                            <span>Super Admin</span>
                          </span>
                        ) : isAdmin ? (
                          <span className="inline-flex items-center space-x-1 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-extrabold border border-blue-200">
                            <KeyRound className="w-3 h-3 text-blue-600" />
                            <span>Administrator</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-extrabold border border-emerald-200">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>Officer</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={isSuper && user.username === "superadmin"}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center space-x-1.5 ${
                            user.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                          } ${isSuper && user.username === "superadmin" ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                          <span>{user.is_active ? "Active" : "Disabled"}</span>
                        </button>
                      </td>

                      <td className="py-4 px-4 text-xs font-mono text-slate-500">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "System Master"}
                      </td>

                      <td className="py-4 px-6 text-right">
                        {isSuper && user.username === "superadmin" ? (
                          <span className="text-[10px] font-bold text-slate-400 italic">Protected</span>
                        ) : (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE NEW USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Provision New User Account</h3>
                <p className="text-xs text-slate-500">Create access credentials for system administration.</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navjot Sharma"
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. navjot_admin"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Access Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e: any) => setFormRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="admin">Administrator (Full System & Operational Access)</option>
                  <option value="officer">Officer (Department & Field Access)</option>
                  <option value="superadmin">Super Admin (Includes User Management Authority)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 text-center">Confirm User Deletion</h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Are you sure you want to permanently delete account <span className="font-bold text-slate-800">@{userToDelete.username}</span> ({userToDelete.full_name})?
            </p>

            <div className="mt-6 flex items-center justify-center space-x-3">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center space-x-1 flex-1 disabled:opacity-70"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
