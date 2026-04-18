/**
 * SessionList Component
 */

import { motion, AnimatePresence } from "framer-motion";
import { Inbox, AlertCircle, CheckSquare, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@core/utils";
import { Session } from "@core/types";
import { SessionCard } from "@features/sessions/components/SessionCard";
import { ConfirmationModal } from "@shared/components/ui/ConfirmationModal";

interface SessionListProps {
    sessions: Session[];
    isLoading: boolean;
    error: string | null;
    onLogout: (sessionId: string) => Promise<boolean>;
    loggingOutId: string | null;
    onVerify: (sessionId: string) => Promise<boolean>;
    verifyingId: string | null;
    onDeleteMultiple?: (sessionIds: string[]) => Promise<boolean>;
    onDetail?: (sessionId: string) => void;
    onLaunchBrowser: (sessionId: string) => void;
    onCloseBrowser?: (sessionId: string) => void;
    onShowPortal?: (sessionId: string) => void;
    isClosingId?: string | null;
    transitioningSessions?: Record<string, { status: string; logs: string[] }>;
    openBrowsers?: string[];
    viewMode?: "grid" | "list";
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            damping: 25,
            stiffness: 200
        }
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        transition: { duration: 0.2 }
    }
};

function LoadingSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
    return (
        <div className={cn(
            viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
                : "flex flex-col gap-4"
        )}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className={cn(
                    "glass-container animate-pulse",
                    viewMode === "grid" ? "rounded-3xl p-6 h-64" : "rounded-2xl p-4 h-20"
                )}>
                    <div className="flex items-center justify-between h-full">
                        <div className="space-y-4 flex-1">
                            <div className="h-4 bg-white/5 rounded-lg w-1/3" />
                            <div className="h-3 bg-white/5 rounded-md w-1/4" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function SessionList({
    sessions,
    isLoading,
    error,
    onLogout,
    loggingOutId,
    onVerify,
    verifyingId,
    onDeleteMultiple,
    onDetail,
    onLaunchBrowser,
    onCloseBrowser,
    onShowPortal,
    isClosingId,
    transitioningSessions,
    openBrowsers = [],
    viewMode = "grid",
}: SessionListProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    if (isLoading) return <LoadingSkeleton viewMode={viewMode} />;

    const toggleSelectAll = () => {
        if (selectedIds.length === sessions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(sessions.map((s) => s.id));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (!onDeleteMultiple || selectedIds.length === 0) return;
        setIsDeleting(true);
        try {
            const success = await onDeleteMultiple(selectedIds);
            if (success) {
                setSelectedIds([]);
                setIsDeleteModalOpen(false);
            }
        } catch (err) {
            console.error("Failed to delete sessions", err);
        } finally {
            setIsDeleting(false);
        }
    };

    if (error) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 text-center"
            >
                <div className="p-4 rounded-3xl bg-red-500/10 border border-red-500/20 mb-4 text-red-500">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
                <p className="text-red-400 max-w-sm mx-auto">{error}</p>
            </motion.div>
        );
    }

    if (sessions.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center glass-container rounded-[40px] border-dashed"
            >
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10 mb-6 text-gray-500">
                    <Inbox className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">
                    No active sessions
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                    Start by adding your first session. Authenticated sessions will safely appear here.
                </p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {sessions.length > 0 && (
                <div className="flex items-center justify-between px-2">
                    <button
                        onClick={toggleSelectAll}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors"
                    >
                        {selectedIds.length === sessions.length && sessions.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                            <Square className="w-4 h-4" />
                        )}
                        {selectedIds.length === sessions.length && sessions.length > 0
                            ? "Deselect All"
                            : "Select All"}
                    </button>

                    <AnimatePresence>
                        {selectedIds.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onClick={() => setIsDeleteModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/20 transition-all border-dashed"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Selected ({selectedIds.length})
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            )}

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                layout
                className={cn(
                    "transition-all duration-500",
                    viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-5 gap-6"
                        : "flex flex-col gap-4"
                )}
            >
                {viewMode === "list" && (
                    <div className="flex items-center gap-6 px-6 py-4 border-b border-white/5 text-[9px] font-black uppercase tracking-[0.35em] text-gray-500 mb-2 pl-12">
                        <div className="w-12 shrink-0">ID</div>
                        <div className="flex-1 min-w-0">Account / Provider</div>
                        <div className="hidden lg:block w-48 shrink-0">Browser State</div>
                        <div className="w-64 shrink-0 text-right">Operation Console</div>
                    </div>
                )}
                <AnimatePresence mode="popLayout">
                    {sessions.map((session) => (
                        <motion.div
                            key={session.id}
                            layout
                            variants={itemVariants}
                            exit="exit"
                        >
                            <SessionCard
                                session={session}
                                onLogout={onLogout}
                                isLoggingOut={loggingOutId === session.id}
                                onVerify={onVerify}
                                isVerifying={verifyingId === session.id}
                                onDetail={onDetail}
                                onLaunchBrowser={onLaunchBrowser}
                                onCloseBrowser={onCloseBrowser}
                                onShowPortal={onShowPortal}
                                isClosing={isClosingId === session.id}
                                transitionData={transitioningSessions?.[session.id]}
                                isBrowserOpen={openBrowsers.includes(session.id)}
                                variant={viewMode}
                                isSelected={selectedIds.includes(session.id)}
                                onToggleSelection={() => toggleSelect(session.id)}
                            />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </motion.div>

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteSelected}
                title="Delete Sessions"
                message={`Are you sure you want to delete ${selectedIds.length} selected sessions? This action cannot be undone.`}
                confirmLabel={isDeleting ? "Deleting..." : "Delete All"}
                isProcessing={isDeleting}
                variant="danger"
            />
        </div>
    );
}
