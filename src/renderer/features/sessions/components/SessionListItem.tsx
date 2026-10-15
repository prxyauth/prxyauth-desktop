/**
 * SessionListItem — the compact "list" variant row of a session card.
 * Extracted from SessionCard (which keeps the grid variant) so each
 * variant evolves independently.
 */
import { useState } from "react";
import {
    CheckSquare,
    Home,
    RefreshCw,
    Shield,
    Square,
    Trash2,
    Zap,
    Fingerprint as FingerprintIcon,
} from "lucide-react";
import { Session } from "@core/types";
import { cn } from "@core/utils";
import { formatDateTime } from "@shared/utils/date";
import { StatusBadge } from "@shared/components/ui/StatusBadge";
import { ConfirmationModal } from "@shared/components/ui/ConfirmationModal";
import { getProviderInfo } from "./provider-info";

interface SessionListItemProps {
    session: Session;
    onLogout: (sessionId: string) => Promise<boolean>;
    isLoggingOut: boolean;
    onVerify: (sessionId: string) => Promise<boolean>;
    isVerifying: boolean;
    onDetail?: (sessionId: string) => void;
    onLaunchBrowser: (sessionId: string) => void;
    onShowPortal?: (sessionId: string) => void;
    onCloseBrowser?: (sessionId: string) => void;
    isClosing?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    isBrowserOpen?: boolean;
    browserStatus?: string;
    transitionData?: { status: string; logs: string[] };
}

export function SessionListItem({
    session,
    onLogout,
    isLoggingOut,
    onVerify,
    isVerifying,
    onDetail,
    onLaunchBrowser,
    onShowPortal,
    onCloseBrowser,
    isClosing,
    isSelected,
    onToggleSelection,
    isBrowserOpen,
    browserStatus,
    transitionData,
}: SessionListItemProps) {
    const [showConfirmLogout, setShowConfirmLogout] = useState(false);
    const providerInfo = getProviderInfo(session.provider);
    const ProviderIcon = providerInfo.Icon;

    const handleLogoutClick = () => {
        setShowConfirmLogout(true);
    };

    const handleConfirmLogout = async () => {
        setShowConfirmLogout(false);
        await onLogout(session.id);
    };

return (
        <div
            className={cn(
                "group glass-container rounded-2xl p-3 glass-card-hover relative overflow-hidden flex items-center gap-6 border transition-all cursor-pointer",
                isSelected
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/5 hover:border-primary/20",
            )}
            onClick={() => onToggleSelection?.()}
        >
            {/* Selection Checkbox */}
            {onToggleSelection && (
                <div className="flex items-center pl-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelection();
                        }}
                        className="text-gray-500 hover:text-primary transition-colors"
                    >
                        {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                    </button>
                </div>
            )}

            {/* ID Column */}
            <div className="w-12 shrink-0 flex flex-col items-center">
                <span className="text-[10px] font-mono text-gray-500 group-hover:text-primary/60 transition-colors">
                    {session.id.slice(-4).toUpperCase()}
                </span>
                <ProviderIcon className={cn("w-3 h-3 mt-1", providerInfo.color)} />
            </div>

            {/* Account Column */}
            <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className="flex flex-col min-w-0">
                    <h3 className="text-sm font-bold text-white truncate max-w-[240px] group-hover:text-primary transition-colors">
                        {session.email}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span
                            className={cn(
                                "text-[9px] font-black uppercase tracking-widest",
                                providerInfo.color,
                            )}
                        >
                            {providerInfo.name}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono">
                            • {formatDateTime(session.createdAt)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Status/Transition Column */}
            <div className="hidden lg:flex w-48 shrink-0 flex-col justify-center">
                {transitionData ? (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                                {transitionData.status}
                            </span>
                        </div>
                        {transitionData.logs.length > 0 && (
                            <p className="text-[8px] text-gray-500 font-mono truncate pl-3.5">
                                {transitionData.logs[transitionData.logs.length - 1]}
                            </p>
                        )}
                    </div>
                ) : (
                    <StatusBadge status={session.status} size="sm" />
                )}
            </div>

            {/* Operations Column */}
            <div
                className="w-64 shrink-0 flex items-center justify-end gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => onVerify(session.id)}
                    disabled={isVerifying || isLoggingOut}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-primary/30"
                    title="Verify Session"
                >
                    {isVerifying ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Shield className="w-4 h-4 text-emerald-500" />
                    )}
                </button>

                {onDetail && (
                    <button
                        onClick={() => onDetail(session.id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-primary/30"
                        title="Session Details"
                    >
                        <FingerprintIcon className="w-4 h-4 text-primary" />
                    </button>
                )}

                {isBrowserOpen && onShowPortal && (
                    <button
                        onClick={() => onShowPortal(session.id)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-primary/30"
                        title="Return to Portal"
                    >
                        <Home className="w-4 h-4 text-primary" />
                    </button>
                )}

                {browserStatus === "launching" ? (
                    <button
                        disabled
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-widest transition-all border border-amber-500/20 opacity-80 cursor-not-allowed"
                    >
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Launching
                    </button>
                ) : isBrowserOpen ? (
                    <button
                        onClick={() => onCloseBrowser?.(session.id)}
                        disabled={!!transitionData || isClosing}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-orange-500/10 text-emerald-400 hover:text-orange-400 text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 hover:border-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed group/stop"
                    >
                        {transitionData || isClosing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.5)] group-hover/stop:hidden" />
                                <RefreshCw className="w-4 h-4 hidden group-hover/stop:block" />
                            </>
                        )}
                        <span className="group-hover/stop:hidden">Active</span>
                        <span className="hidden group-hover/stop:inline">Stop</span>
                    </button>
                ) : (
                    <button
                        onClick={() => onLaunchBrowser(session.id)}
                        disabled={!!transitionData}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {transitionData ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Zap className="w-4 h-4 fill-white" />
                        )}
                        Launch
                    </button>
                )}

                <button
                    onClick={handleLogoutClick}
                    disabled={isLoggingOut}
                    className="p-2.5 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
                    title="Terminate"
                >
                    {isLoggingOut ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <Trash2 className="w-4 h-4" />
                    )}
                </button>
            </div>

            <ConfirmationModal
                isOpen={showConfirmLogout}
                onClose={() => setShowConfirmLogout(false)}
                onConfirm={handleConfirmLogout}
                title="Terminate Connection"
                message={`Are you sure you want to terminate the connection for ${session.email}?`}
                confirmLabel="Terminate"
                variant="danger"
            />
        </div>
    );}