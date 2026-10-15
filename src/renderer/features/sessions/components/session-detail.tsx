/**
 * Session-detail building blocks — extracted from SessionDetailPage
 * so the page is layout + data and each block evolves independently.
 */

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@core/utils";

// Info card component
export function InfoCard({
    icon: Icon,
    label,
    value,
    color = "text-gray-400",
    mono = false,
    isSensitive = false,
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
                <div
                    className={cn(
                        "p-2 rounded-xl bg-white/5",
                        color.replace("text-", "text-opacity-80"),
                    )}
                >
                    <Icon className={cn("w-4 h-4", color)} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-1">
                        {label}
                    </p>
                    <p className={cn("text-sm text-white truncate", mono && "font-mono text-xs")}>
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
export function UserAgentBlock({ value }: { value?: string }) {
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
export function Section({
    title,
    icon: Icon,
    children,
    color = "text-primary",
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
                <div
                    className={cn(
                        "p-2.5 rounded-xl bg-white/5",
                        color.replace("text-", "bg-opacity-10"),
                    )}
                >
                    <Icon className={cn("w-5 h-5", color)} />
                </div>
                <h2 className="text-lg font-black uppercase tracking-wide text-white">{title}</h2>
            </div>
            {children}
        </motion.section>
    );
}

// Loading spinner
export function Spinner() {
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
