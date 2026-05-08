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
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";

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
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      session.email.toLowerCase().includes(query) ||
      session.provider?.toLowerCase().includes(query);
    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeSessions = filteredSessions.filter(
    (s) => s.status === "AUTHENTICATED",
  ).length;
  const pendingSessions = filteredSessions.filter(
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

        <div className="flex items-center gap-3">
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
          },
          {
            label: "Authenticated",
            value: activeSessions,
            icon: ShieldCheck,
            color: "text-emerald-400",
            active: true,
          },
          {
            label: "Pending Vaults",
            value: pendingSessions,
            icon: Zap,
            color: "text-primary",
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-container rounded-[32px] p-8 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 border-white/5 shadow-2xl shadow-black/20"
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
        ))}
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
