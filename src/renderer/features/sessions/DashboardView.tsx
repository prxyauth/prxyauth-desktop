/**
 * DashboardView - Main view for session management
 */

import { cn } from "@core/utils";
import { motion } from "framer-motion";
import { Activity, Layers, LayoutGrid, List, ShieldCheck, Zap } from "lucide-react";
import { useState } from "react";

import { SessionList } from "@features/sessions/components/SessionList";
import { useSessions } from "@features/sessions/hooks/useSessions";

interface DashboardViewProps {
    onNavigateToSession?: (sessionId: string) => void;
    searchQuery?: string;
}

export function DashboardView({ onNavigateToSession, searchQuery = "" }: DashboardViewProps) {
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

    const filteredSessions = sessions.filter(session => {
        const query = searchQuery.toLowerCase();
        return (
            session.email.toLowerCase().includes(query) ||
            session.provider?.toLowerCase().includes(query)
        );
    });

    const activeSessions = filteredSessions.filter(s => s.status === 'authenticated').length;
    const pendingSessions = filteredSessions.filter(s => s.status === 'authenticating' || s.status === 'pending').length;

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
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
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
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                            Grid
                        </button>
                    </div>

                </div>
            </div>

            {/* Stats Quick Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ scale: 1.02 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-container rounded-[24px] p-5 border-blue-500/10 hover:border-blue-500/30 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                            <Layers className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total</div>
                            <div className="text-2xl font-black text-white">{sessions.length}</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ scale: 1.02 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-container rounded-[24px] p-5 border-emerald-500/10 hover:border-emerald-500/30 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Active</div>
                            <div className="text-2xl font-black text-emerald-400">{activeSessions}</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ scale: 1.02 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-container rounded-[24px] p-5 border-primary/10 hover:border-primary/30 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Pending</div>
                            <div className="text-2xl font-black text-white">{pendingSessions}</div>
                        </div>
                    </div>
                </motion.div>
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


        </div >
    );
}
