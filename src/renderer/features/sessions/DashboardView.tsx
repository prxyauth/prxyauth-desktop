/**
 * DashboardView - Main view for session management
 */

import { cn } from "@core/utils";
import { SessionStatus } from "@core/types";
import { motion } from "framer-motion";
import {
  Activity,
  Filter,
  Layers,
  LayoutGrid,
  List,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { SessionList } from "@features/sessions/components/SessionList";
import { useSessions } from "@features/sessions/hooks/useSessions";

interface DashboardViewProps {
  onNavigateToSession?: (sessionId: string) => void;
  searchQuery?: string;
}

export function DashboardView({
  onNavigateToSession,
  searchQuery = "",
}: DashboardViewProps) {
  const {
    sessions,
    isLoading,
    error,
    logout,
    deleteMultiple,
    loggingOutId,
    verify,
    verifyingId,
    launchSessionBrowser,
    closeSessionBrowser,
    showSessionPortal,
    isClosing,
    transitioningSessions,
    openBrowsers,
    browserStatuses,
  } = useSessions();

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleLaunchBrowser = async (sessionId: string) => {
    try {
      await launchSessionBrowser(sessionId);
    } catch (err) {
      console.error("Failed to launch browser:", err);
    }
  };

  const handleOpenDetail = (sessionId: string) => {
    onNavigateToSession?.(sessionId);
  };

  const filteredSessions = sessions.filter((session) => {
    const query = localSearchQuery.toLowerCase();
    const matchesSearch =
      session.email.toLowerCase().includes(query) ||
      session.provider?.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeSessionsTotal = sessions.filter(
    (s) => s.status === "AUTHENTICATED",
  ).length;
  const pendingSessionsTotal = sessions.filter(
    (s) => s.status === "AUTHENTICATING" || s.status === "PENDING",
  ).length;

  return (
    <div className="space-y-6 sm:space-y-8 p-1 sm:p-2 lg:p-4">
      {/* Header Section */}
      <div className="sticky top-0 z-[60] -mx-4 px-4 py-6 mb-6 bg-black/40 backdrop-blur-3xl border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 transition-all duration-300">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-none">
            Active <span className="text-primary italic">Sessions</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-[0.25em] font-black text-[9px] mt-3 flex items-center gap-2">
            <Activity className="w-3 h-3 text-primary" />
            Stealth Connection Monitor
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative group min-w-[200px] sm:min-w-[240px] no-drag">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-2xl h-12 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all hover:bg-white/[0.07]"
            />
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 h-12 shadow-inner">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                viewMode === "list"
                  ? "bg-primary text-white shadow-[0_4px_12px_rgba(129,140,248,0.3)]"
                  : "text-gray-500 hover:text-white hover:bg-white/5",
              )}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-2.5 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                viewMode === "grid"
                  ? "bg-primary text-white shadow-[0_4px_12px_rgba(129,140,248,0.3)]"
                  : "text-gray-500 hover:text-white hover:bg-white/5",
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid
            </button>
          </div>

          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white/5 border border-white/5 rounded-2xl h-12 pl-10 pr-10 text-[10px] font-black uppercase tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all cursor-pointer min-w-[170px]"
            >
              <option value="all" className="bg-black">All Status</option>
              <option value={SessionStatus.AUTHENTICATED} className="bg-black">Authenticated</option>
              <option value={SessionStatus.REQUIRES_2FA} className="bg-black">Requires 2FA</option>
              <option value={SessionStatus.PENDING} className="bg-black">Pending</option>
              <option value={SessionStatus.EXPIRED} className="bg-black">Expired</option>
              <option value={SessionStatus.FAILED} className="bg-black">Failed</option>
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {[
          {
            label: "Total Handlers",
            value: sessions.length,
            icon: Layers,
            color: "text-blue-400",
            status: "all",
            activeBorder: "border-blue-500/40 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
            border: "border-white/5",
          },
          {
            label: "Authenticated",
            value: activeSessionsTotal,
            icon: ShieldCheck,
            color: "text-emerald-400",
            active: true,
            status: "AUTHENTICATED",
            activeBorder: "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
            border: "border-white/5",
          },
          {
            label: "Pending Vaults",
            value: pendingSessionsTotal,
            icon: Zap,
            color: "text-primary",
            status: "PENDING",
            activeBorder: "border-primary/40 bg-primary/10 shadow-[0_0_20px_rgba(129,140,248,0.15)]",
            border: "border-white/5",
          },
        ].map((stat, idx) => {
          const isSelected = statusFilter === stat.status;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setStatusFilter(stat.status)}
              className={cn(
                "glass-container rounded-[32px] p-8 relative overflow-hidden group hover:scale-[1.02] cursor-pointer transition-all duration-500 shadow-2xl shadow-black/20",
                isSelected ? stat.activeBorder : stat.border
              )}
            >
              <div
                className={cn(
                  "absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity",
                  stat.color,
                )}
              >
                <stat.icon className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 ml-0.5">
                {stat.label}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-4xl font-black tracking-tighter",
                    stat.color,
                  )}
                >
                  {stat.value}
                </span>
                {stat.active && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-white/5 pb-6">
        {[
          { label: "All Status", value: "all", color: "border-blue-500/10 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/30" },
          { label: "Authenticated", value: "AUTHENTICATED", color: "border-emerald-500/10 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30" },
          { label: "Requires 2FA", value: "REQUIRES_2FA", color: "border-amber-500/10 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/30" },
          { label: "Pending", value: "PENDING", color: "border-indigo-500/10 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/30" },
          { label: "Expired", value: "EXPIRED", color: "border-gray-500/10 text-gray-400 bg-gray-500/5 hover:bg-gray-500/10 hover:border-gray-500/30" },
          { label: "Failed", value: "FAILED", color: "border-red-500/10 text-red-400 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/30" },
        ].map((pill) => {
          const isSelected = statusFilter === pill.value;
          const count = pill.value === "all"
            ? sessions.length
            : sessions.filter((s) => s.status === pill.value).length;
          return (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 active:scale-95 flex items-center gap-2",
                isSelected
                  ? "border-primary/50 bg-primary/20 text-white shadow-[0_0_15px_rgba(129,140,248,0.2)]"
                  : pill.color
              )}
            >
              {pill.label}
              <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] text-gray-400 font-bold border border-white/5">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <SessionList
        sessions={filteredSessions}
        isLoading={isLoading}
        error={error}
        onLogout={logout}
        onDeleteMultiple={deleteMultiple}
        loggingOutId={loggingOutId}
        onVerify={verify}
        verifyingId={verifyingId}
        onLaunchBrowser={handleLaunchBrowser}
        onCloseBrowser={closeSessionBrowser}
        onShowPortal={showSessionPortal}
        isClosingId={isClosing}
        transitioningSessions={transitioningSessions}
        openBrowsers={openBrowsers}
        browserStatuses={browserStatuses}
        onDetail={handleOpenDetail}
        viewMode={viewMode}
      />
    </div>
  );
}
