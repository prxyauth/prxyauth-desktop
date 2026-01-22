/**
 * SessionDetailModal Component
 * Displays comprehensive information about a session
 */

import { AnimatePresence, motion } from "framer-motion";
import {
    Clock,
    Cpu,
    Database,
    Fingerprint as FingerprintIcon,
    Globe,
    MapPin,
    Monitor,
    Server,
    Shield,
    Terminal,
    X
} from "lucide-react";
import { Session } from "@core/types";
import { cn } from "@core/utils";
import { StatusBadge } from "@shared/components/ui/StatusBadge";

interface SessionDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session | null;
}

export function SessionDetailModal({ isOpen, onClose, session }: SessionDetailModalProps) {
    if (!session) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString("en-US", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const InfoSection = ({ title, icon: Icon, children, className }: { title: string, icon: any, children: React.ReactNode, className?: string }) => (
        <div className={cn("space-y-4 p-6 rounded-3xl bg-white/5 border border-white/5", className)}>
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">{title}</h4>
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );

    const InfoRow = ({ label, value, subValue }: { label: string, value: string | React.ReactNode, subValue?: string }) => (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-200 break-all">{value}</span>
                {subValue && <span className="text-[10px] text-gray-500 font-mono mt-0.5">{subValue}</span>}
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-4xl max-h-[90vh] glass-container rounded-[40px] shadow-2xl overflow-hidden border-white/10 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-white/5 flex items-start justify-between bg-white/[0.02]">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-3xl font-black text-white tracking-tight leading-none uppercase">
                                        Session <span className="text-primary italic">Detail</span>
                                    </h2>
                                    <StatusBadge status={session.status} />
                                </div>
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Terminal className="w-3.5 h-3.5" />
                                    <span className="font-mono text-[10px] tracking-wider uppercase">{session.id}</span>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Account Info */}
                                <InfoSection title="Account & Identity" icon={Shield}>
                                    <InfoRow label="Email Address" value={session.email} />
                                    <InfoRow label="Provider" value={session.provider?.toUpperCase() || "GOOGLE"} />
                                    <InfoRow label="Established" value={formatDate(session.createdAt)} />
                                    <InfoRow label="Expires" value={formatDate(session.expiresAt)} />
                                </InfoSection>

                                {/* Proxy Info */}
                                <InfoSection title="Network Configuration" icon={Globe}>
                                    {session.proxy ? (
                                        <>
                                            <InfoRow label="Proxy Server" value={session.proxy.server} />
                                            <InfoRow label="External IP" value={session.proxy.externalIp || "Unknown"} />
                                            <InfoRow label="Location" value={`${session.proxy.city || ""}, ${session.proxy.country || "Unknown"}`} subValue={session.proxy.region} />
                                            <InfoRow label="Timezone" value={session.proxy.timezone || "System Default"} />
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-center py-6 text-gray-500 italic text-sm">
                                            No proxy configured - Direct connection
                                        </div>
                                    )}
                                </InfoSection>
                            </div>

                            {/* Fingerprint Info */}
                            {session.fingerprint && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                            <FingerprintIcon className="w-4 h-4" />
                                        </div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Browser Fingerprint</h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                            <Monitor className="w-5 h-5 text-gray-500" />
                                            <InfoRow label="Screen" value={`${session.fingerprint.screen.width}x${session.fingerprint.screen.height}`} subValue={`Scale: ${session.fingerprint.deviceScaleFactor}`} />
                                            <InfoRow label="Viewport" value={`${session.fingerprint.viewport.width}x${session.fingerprint.viewport.height}`} />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                            <Cpu className="w-5 h-5 text-gray-500" />
                                            <InfoRow label="Concurrency" value={`${session.fingerprint.hardwareConcurrency} Cores`} />
                                            <InfoRow label="Memory" value={`${session.fingerprint.deviceMemory} GB`} />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                            <Database className="w-5 h-5 text-gray-500" />
                                            <InfoRow label="GPU Vendor" value={session.fingerprint.webgl.vendor} />
                                            <InfoRow label="Renderer" value={session.fingerprint.webgl.renderer} />
                                        </div>
                                        <div className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                            <MapPin className="w-5 h-5 text-gray-500" />
                                            <InfoRow label="Language" value={session.fingerprint.language} />
                                            <InfoRow label="Timezone ID" value={session.fingerprint.timezoneId} />
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                                        <InfoRow label="User Agent" value={session.fingerprint.userAgent} />
                                    </div>
                                </div>
                            )}

                            {/* Advanced / Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 p-6 rounded-3xl bg-white/5 border border-white/5 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Server className="w-4 h-4 text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white">System Flags</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {session.browserMode && (
                                            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                Mode: {session.browserMode}
                                            </span>
                                        )}
                                        {session.fingerprint?.isMobile && (
                                            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                                Mobile Emulation
                                            </span>
                                        )}
                                        {session.fingerprint?.hasTouch && (
                                            <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                                                Touch Enabled
                                            </span>
                                        )}
                                        <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-primary uppercase tracking-widest">
                                            Stealth Activated
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col justify-center items-center text-center space-y-2">
                                    <Clock className="w-6 h-6 text-primary mb-2" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Last Active</span>
                                    <span className="text-sm font-bold text-white uppercase italic tracking-tighter">
                                        {session.lastUsedAt ? formatDate(session.lastUsedAt) : 'Never'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-end gap-4">
                            <button
                                onClick={onClose}
                                className="px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-[0.2em] transition-all border border-white/5"
                            >
                                Close Detail
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
