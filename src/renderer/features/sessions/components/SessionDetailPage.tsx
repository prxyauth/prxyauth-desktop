/**
 * SessionDetailPage Component
 * Full-page session detail view with all session information
 * Adapted from fe-prxyauth session detail page
 */

import { motion } from "framer-motion";
import {
    ArrowLeft,
    Check,
    CheckCircle,
    Clock,
    Copy,
    Cpu,
    Eye,
    EyeOff,
    Fingerprint,
    Globe,
    Maximize2,
    Monitor,
    Palette,
    Server,
    Shield,
    Smartphone,
    Trash2,
    ExternalLink,
    Play,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Session } from "@core/types";
import { cn } from "@core/utils";
import { StatusBadge } from "@shared/components/ui/StatusBadge";
import { ConfirmationModal } from "@shared/components/ui/ConfirmationModal";
import { useSessions } from "@features/sessions/hooks/useSessions";

interface SessionDetailPageProps {
    sessionId: string;
    onBack: () => void;
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.abs(Math.round(diffMs / (1000 * 60 * 60)));
    const diffDays = Math.abs(Math.round(diffMs / (1000 * 60 * 60 * 24)));

    if (diffMs > 0) {
        if (diffHours < 24) return `Expires in ${diffHours}h`;
        return `Expires in ${diffDays}d`;
    } else {
        if (diffHours < 24) return `Expired ${diffHours}h ago`;
        return `Expired ${diffDays}d ago`;
    }
}

// Info card component
function InfoCard({
    icon: Icon,
    label,
    value,
    color = "text-gray-400",
    mono = false,
    isSensitive = false
}: {
    icon: React.ElementType;
    label: string;
    value: string | number | undefined;
    color?: string;
    mono?: boolean;
    isSensitive?: boolean;
}) {
    const [copied, setCopied] = useState(false);
    const [isMasked, setIsMasked] = useState(isSensitive);

    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(String(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayValue = isMasked ? "••••••••" : value;

    return (
        <div className="group relative bg-white/[0.03] border border-white/5 rounded-2xl p-4 hover:bg-white/[0.05] hover:border-white/10 transition-all">
            <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-xl bg-white/5", color.replace("text-", "text-opacity-80"))}>
                    <Icon className={cn("w-4 h-4", color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-1">
                        {label}
                    </p>
                    <p className={cn(
                        "text-sm text-white truncate",
                        mono && "font-mono text-xs"
                    )}>
                        {displayValue ?? "—"}
                    </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    {isSensitive && value && (
                        <button
                            onClick={() => setIsMasked(!isMasked)}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                            title={isMasked ? "Show" : "Hide"}
                        >
                            {isMasked ? (
                                <Eye className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                                <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                            )}
                        </button>
                    )}
                    {value && (
                        <button
                            onClick={handleCopy}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                            title="Copy"
                        >
                            {copied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// User Agent block with copy button
function UserAgentBlock({ value }: { value?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="group relative p-4 bg-black/30 rounded-xl border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                    User Agent
                </p>
                {value && (
                    <button
                        onClick={handleCopy}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 transition-all"
                        title="Copy User Agent"
                    >
                        {copied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                        )}
                    </button>
                )}
            </div>
            <p className="text-xs text-gray-300 font-mono break-all leading-relaxed">
                {value || "—"}
            </p>
        </div>
    );
}

// Section component
function Section({
    title,
    icon: Icon,
    children,
    color = "text-primary"
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    color?: string;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-container rounded-[28px] p-6 sm:p-8"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className={cn("p-2.5 rounded-xl bg-white/5", color.replace("text-", "bg-opacity-10"))}>
                    <Icon className={cn("w-5 h-5", color)} />
                </div>
                <h2 className="text-lg font-black uppercase tracking-wide text-white">
                    {title}
                </h2>
            </div>
            {children}
        </motion.section>
    );
}

// Loading spinner
function Spinner() {
    return (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
        </svg>
    );
}

export function SessionDetailPage({ sessionId, onBack }: SessionDetailPageProps) {
    const { sessions, logout, verify, verifyingId, launchSessionBrowser } = useSessions();
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showConfirmTerminate, setShowConfirmTerminate] = useState(false);
    const [isTerminating, setIsTerminating] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);

    // Find session from context
    useEffect(() => {
        const found = sessions.find(s => s.id === sessionId);
        if (found) {
            setSession(found);
            setIsLoading(false);
        } else if (sessions.length > 0) {
            setError("Session not found");
            setIsLoading(false);
        }
    }, [sessionId, sessions]);

    const handleVerify = async () => {
        if (!session) return;
        try {
            await verify(session.id);
        } catch (err) {
            console.error("Failed to verify session:", err);
        }
    };

    const handleLaunchBrowser = async () => {
        if (!session) return;
        try {
            setIsLaunching(true);
            await launchSessionBrowser(session.id);
        } catch (err) {
            console.error("Failed to launch browser:", err);
        } finally {
            setIsLaunching(false);
        }
    };

    const handleTerminateClick = () => {
        setShowConfirmTerminate(true);
    };

    const handleConfirmTerminate = async () => {
        setShowConfirmTerminate(false);
        if (!session) return;
        try {
            setIsTerminating(true);
            await logout(session.id);
            onBack();
        } catch (err) {
            console.error("Failed to terminate session:", err);
            setIsTerminating(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Loading Session
                </p>
            </div>
        );
    }

    if (error && !session) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="glass-container rounded-2xl p-8 text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Session Not Found</h2>
                    <p className="text-sm text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={onBack}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const fp = session.fingerprint;
    const providerColors: Record<string, string> = {
        google: "text-blue-400",
        office: "text-orange-400",
        github: "text-purple-400",
    };

    const isVerifying = verifyingId === session.id;

    return (
        <div className="space-y-8">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                <button onClick={onBack} className="hover:text-primary transition-colors flex items-center gap-2">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Dashboard
                </button>
                <span className="opacity-30">/</span>
                <span className="text-white">Session Detail</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-black text-white truncate tracking-tight">
                        {session.email}
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mt-1">
                        {session.provider?.toUpperCase() || "SESSION"} • {formatRelativeTime(session.expiresAt)}
                    </p>
                </div>
                <StatusBadge status={session.status} />
            </div>

            <main className="space-y-6">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                    >
                        {error}
                    </motion.div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <button
                        onClick={handleVerify}
                        disabled={isVerifying || isTerminating}
                        className="relative group py-4 px-4 rounded-2xl transition-all disabled:opacity-50 bg-primary/10 border border-primary/20 hover:border-primary/40"
                    >
                        <span className="flex items-center justify-center gap-2 text-primary font-bold text-sm">
                            {isVerifying ? <Spinner /> : <CheckCircle className="w-4 h-4" />}
                            Verify
                        </span>
                    </button>

                    <button
                        onClick={handleLaunchBrowser}
                        disabled={isVerifying || isTerminating || isLaunching}
                        className="relative group py-4 px-4 rounded-2xl transition-all disabled:opacity-50 bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40"
                    >
                        <span className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                            {isLaunching ? <Spinner /> : <Play className="w-4 h-4" />}
                            Launch Browser
                        </span>
                    </button>

                    <button
                        onClick={handleTerminateClick}
                        disabled={isVerifying || isTerminating}
                        className="relative group py-4 px-4 rounded-2xl transition-all disabled:opacity-50 bg-red-500/10 border border-red-500/20 hover:border-red-500/40"
                    >
                        <span className="flex items-center justify-center gap-2 text-red-400 font-bold text-sm">
                            {isTerminating ? <Spinner /> : <Trash2 className="w-4 h-4" />}
                            Delete
                        </span>
                    </button>
                </div>

                {/* Session Overview */}
                <Section title="Session Overview" icon={Shield} color="text-primary">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <InfoCard
                            icon={Server}
                            label="Provider"
                            value={session.provider?.toUpperCase()}
                            color={session.provider ? providerColors[session.provider] : "text-gray-400"}
                        />
                        <InfoCard icon={Globe} label="Email" value={session.email} />
                        {session.password && (
                            <InfoCard
                                icon={Shield}
                                label="Session Password"
                                value={session.password}
                                isSensitive
                            />
                        )}
                        <InfoCard icon={Shield} label="Session ID" value={session.id} mono />
                        <InfoCard icon={Clock} label="Created" value={formatDate(session.createdAt)} />
                        {session.ipAddress && (
                            <InfoCard icon={Server} label="IP Address" value={session.ipAddress} mono />
                        )}
                        {session.lastUrl && (
                            <InfoCard icon={ExternalLink} label="Last URL" value={session.lastUrl} mono />
                        )}
                    </div>
                </Section>

                {/* Proxy Information */}
                {session.proxy && (
                    <Section title="Proxy Configuration" icon={Server} color="text-orange-400">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <InfoCard icon={Server} label="Server" value={session.proxy.server} mono />
                            {session.proxy.externalIp && (
                                <InfoCard icon={Globe} label="External IP" value={session.proxy.externalIp} mono />
                            )}
                            {session.proxy.country && (
                                <InfoCard icon={Globe} label="Country" value={session.proxy.country} />
                            )}
                            {(session.proxy.city || session.proxy.region) && (
                                <InfoCard
                                    icon={Globe}
                                    label="Location"
                                    value={[session.proxy.city, session.proxy.region].filter(Boolean).join(", ")}
                                />
                            )}
                            {session.proxy.timezone && (
                                <InfoCard icon={Clock} label="Proxy Timezone" value={session.proxy.timezone} />
                            )}
                            {session.proxy.username && (
                                <InfoCard icon={Shield} label="Username" value={session.proxy.username} mono />
                            )}
                            {session.proxy.password && (
                                <InfoCard
                                    icon={Shield}
                                    label="Proxy Password"
                                    value={session.proxy.password}
                                    isSensitive
                                />
                            )}
                        </div>
                    </Section>
                )}

                {/* Fingerprint Section */}
                {fp && (
                    <>
                        {/* Browser Identity */}
                        <Section title="Browser Identity" icon={Fingerprint} color="text-cyan-400">
                            <div className="space-y-4">
                                <UserAgentBlock value={fp.userAgent} />

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <InfoCard icon={Monitor} label="Platform" value={fp.userAgentMetadata?.platform} />
                                    <InfoCard
                                        icon={Shield}
                                        label="Platform Version"
                                        value={fp.userAgentMetadata?.platformVersion}
                                    />
                                    <InfoCard icon={Cpu} label="Architecture" value={fp.userAgentMetadata?.architecture} />
                                    <InfoCard icon={Shield} label="Bitness" value={fp.userAgentMetadata?.bitness} />
                                </div>

                                {fp.userAgentMetadata?.brands && fp.userAgentMetadata.brands.length > 0 && (
                                    <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                                        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-3">
                                            Browser Brands
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {fp.userAgentMetadata.brands.map((brand, i) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-300"
                                                >
                                                    {brand.brand} v{brand.version}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Section>

                        {/* Display & Hardware */}
                        <Section title="Display & Hardware" icon={Monitor} color="text-violet-400">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <InfoCard
                                    icon={Maximize2}
                                    label="Screen Resolution"
                                    value={fp.screen ? `${fp.screen.width} × ${fp.screen.height}` : undefined}
                                />
                                <InfoCard
                                    icon={Maximize2}
                                    label="Viewport"
                                    value={fp.viewport ? `${fp.viewport.width} × ${fp.viewport.height}` : undefined}
                                />
                                <InfoCard icon={Palette} label="Color Depth" value={fp.screen?.colorDepth ? `${fp.screen.colorDepth}-bit` : undefined} />
                                <InfoCard icon={Monitor} label="Device Pixel Ratio" value={fp.deviceScaleFactor ? `${fp.deviceScaleFactor}×` : undefined} />
                                <InfoCard icon={Cpu} label="CPU Cores" value={fp.hardwareConcurrency} />
                                <InfoCard icon={Cpu} label="Device Memory" value={fp.deviceMemory ? `${fp.deviceMemory} GB` : undefined} />
                                <InfoCard
                                    icon={Smartphone}
                                    label="Mobile Device"
                                    value={fp.isMobile ? "Yes" : "No"}
                                    color={fp.isMobile ? "text-emerald-400" : "text-gray-400"}
                                />
                                <InfoCard
                                    icon={Smartphone}
                                    label="Touch Support"
                                    value={fp.hasTouch ? "Yes" : "No"}
                                    color={fp.hasTouch ? "text-emerald-400" : "text-gray-400"}
                                />
                            </div>
                        </Section>

                        {/* Graphics & Locale */}
                        <Section title="Graphics & Locale" icon={Palette} color="text-pink-400">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <InfoCard icon={Palette} label="WebGL Vendor" value={fp.webgl?.vendor} mono />
                                <InfoCard icon={Palette} label="WebGL Renderer" value={fp.webgl?.renderer} mono />
                                <InfoCard icon={Globe} label="Language" value={fp.language} />
                                <InfoCard icon={Clock} label="Timezone" value={fp.timezoneId} />
                            </div>
                        </Section>

                        {/* Fingerprint Seed */}
                        <Section title="Fingerprint Seed" icon={Shield} color="text-amber-400">
                            <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-2">
                                    Deterministic Seed (Session-Based)
                                </p>
                                <p className="text-sm text-amber-400 font-mono break-all">
                                    {fp.seed}
                                </p>
                            </div>
                        </Section>
                    </>
                )}

                {/* No Fingerprint Message */}
                {!fp && (
                    <Section title="Fingerprint" icon={Fingerprint} color="text-gray-500">
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                <Fingerprint className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-500 text-sm">
                                No fingerprint data available for this session
                            </p>
                        </div>
                    </Section>
                )}
            </main>

            <ConfirmationModal
                isOpen={showConfirmTerminate}
                onClose={() => setShowConfirmTerminate(false)}
                onConfirm={handleConfirmTerminate}
                title="Delete Session"
                message={`Are you sure you want to delete the session for ${session.email}? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
            />
        </div>
    );
}
