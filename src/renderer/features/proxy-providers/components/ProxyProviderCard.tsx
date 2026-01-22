import { motion } from "framer-motion";
import {
    Layers,
    Trash2,
    CheckCircle2,
    Settings2,
    Zap,
    ExternalLink,
    AlertCircle,
    Power,
    RefreshCw
} from "lucide-react";
import { ProxyProviderConfig, ProxyProviderType } from "@core/types";
import { cn } from "@core/utils";

interface ProxyProviderCardProps {
    provider: ProxyProviderConfig;
    onEdit: (provider: ProxyProviderConfig) => void;
    onRemove: (type: ProxyProviderType) => void;
    onToggle: (type: ProxyProviderType, enabled: boolean) => void;
    onTest: (type: ProxyProviderType) => void;
    isTesting: boolean;
    isRemoving: boolean;
}

const PROVIDER_INFO: Record<ProxyProviderType, { name: string; description: string; color: string; bg: string }> = {
    oxylabs: {
        name: "Oxylabs",
        description: "Premium Residential & Datacenter Proxies",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
    },
    brightdata: {
        name: "Bright Data",
        description: "Global Residential Proxy Network (Luminati)",
        color: "text-orange-400",
        bg: "bg-orange-500/10",
    },
    floppydata: {
        name: "Floppy Data",
        description: "Specialized High-Performance Proxy Service",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
    }
};

export function ProxyProviderCard({
    provider,
    onEdit,
    onRemove,
    onToggle,
    onTest,
    isTesting,
    isRemoving
}: ProxyProviderCardProps) {
    const info = PROVIDER_INFO[provider.provider];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-container glass-card-hover rounded-[32px] p-6 relative overflow-hidden group border border-white/5 hover:border-primary/20 transition-all"
        >
            {/* Background Accent */}
            <div className={cn("absolute -top-12 -right-12 w-32 h-32 blur-[60px] rounded-full transition-opacity duration-500", info.bg, provider.isEnabled ? "opacity-30" : "opacity-10")} />

            <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-colors", info.bg, info.color)}>
                            <Layers className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">{info.name}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{info.description}</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                            provider.isEnabled
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-white/5 text-gray-500 border-white/10"
                        )}>
                            {provider.isEnabled ? "Activated" : "Deactivated"}
                        </div>
                        <span className="text-[9px] font-mono text-gray-600">Priority: {provider.priority}</span>
                    </div>
                </div>

                {/* Configuration Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-[20px] p-4 border border-white/5">
                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Configuration</div>
                        <div className="flex items-center gap-2">
                            {provider.hasCredentials ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-xs font-bold text-white">Credentials Set</span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                                    <span className="text-xs font-bold text-orange-400">Missing Setup</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="bg-white/5 rounded-[20px] p-4 border border-white/5">
                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Connection</div>
                        <div className="flex items-center gap-2">
                            {provider.isEnabled ? (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Ready to Route</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-gray-600" />
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Standby</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Account Summary */}
                {provider.username && (
                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                                <ExternalLink className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Active Identity</p>
                                <p className="text-xs font-mono text-gray-400">{provider.username}</p>
                            </div>
                        </div>
                        {provider.zone && (
                            <div className="text-right">
                                <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Zone</p>
                                <p className="text-xs font-mono text-gray-400">{provider.zone}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                    <button
                        onClick={() => onToggle(provider.provider, !provider.isEnabled)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-2 py-3 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
                            provider.isEnabled
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20"
                                : "bg-white/5 border-white/10 text-gray-500 hover:bg-white/10 hover:text-white"
                        )}
                        title={provider.isEnabled ? "Disable Provider" : "Enable Provider"}
                    >
                        <Power className="w-4 h-4" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Power</span>
                    </button>

                    <button
                        onClick={() => onEdit(provider)}
                        className="flex flex-col items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Settings2 className="w-4 h-4" />
                        <span className="text-[8px] font-black uppercase tracking-tighter">Configure</span>
                    </button>

                    <button
                        onClick={() => onTest(provider.provider)}
                        disabled={isTesting || !provider.hasCredentials}
                        className="flex flex-col items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isTesting ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                            <Zap className="w-4 h-4" />
                        )}
                        <span className="text-[8px] font-black uppercase tracking-tighter">Test Link</span>
                    </button>

                    <button
                        onClick={() => onRemove(provider.provider)}
                        disabled={isRemoving}
                        className="flex flex-col items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isRemoving ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Trash2 className="w-4 h-4" />
                        )}
                        <span className="text-[8px] font-black uppercase tracking-tighter">Purge</span>
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
