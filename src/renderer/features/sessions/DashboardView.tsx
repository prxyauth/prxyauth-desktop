/**
 * DashboardView - Main view for session management
 */

import { cn } from "@core/utils";
import { motion } from "framer-motion";
import {
  Activity,
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
    loggingOutId,
    verify,
    verifyingId,
    launchSessionBrowser,
    closeSessionBrowser,
    showSessionPortal,
    isClosing,
    transitioningSessions,
    openBrowsers,
  } = useSessions();

  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

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
    return (
      session.email.toLowerCase().includes(query) ||
      session.provider?.toLowerCase().includes(query)
    );
  });

  const activeSessions = filteredSessions.filter(
    (s) => s.status === "authenticated",
  ).length;
  const pendingSessions = filteredSessions.filter(
    (s) => s.status === "authenticating" || s.status === "pending",
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
        loggingOutId={loggingOutId}
        onVerify={verify}
        verifyingId={verifyingId}
        onLaunchBrowser={handleLaunchBrowser}
        onCloseBrowser={closeSessionBrowser}
        onShowPortal={showSessionPortal}
        isClosingId={isClosing}
        transitioningSessions={transitioningSessions}
        openBrowsers={openBrowsers}
        onDetail={handleOpenDetail}
        viewMode={viewMode}
      />
    </div>
  );
}
