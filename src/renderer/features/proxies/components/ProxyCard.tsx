import { motion } from "framer-motion";
import { Server, Trash2, Activity, Globe, Hash } from "lucide-react";
import { useState } from "react";
import { ProxyHealthInfo } from "@core/types";
import { cn } from "@core/utils";

interface ProxyCardProps {
    proxy: ProxyHealthInfo;
    onRemove: (server: string) => Promise<boolean>;
    isRemoving: boolean;
}

export function ProxyCard({ proxy, onRemove, isRemoving }: ProxyCardProps) {
    const [confirmRemove, setConfirmRemove] = useState(false);

    const handleRemove = async () => {
        if (!confirmRemove) {
            setConfirmRemove(true);
            setTimeout(() => setConfirmRemove(false), 3000);
            return;
        }
        await onRemove(proxy.server);
        setConfirmRemove(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-container glass-card-hover rounded-[24px] p-6 relative overflow-hidden group"
        >
            {/* Background Icon */}
            <div className="absolute top-4 right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Server className="w-16 h-16 text-primary" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                        proxy.isHealthy
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                        <Server className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm truncate max-w-[180px]">{proxy.server}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-500">
                            <Globe className="w-3 h-3" />
                            <span>IP: {proxy.ip}</span>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div
                    className={cn(
                        "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                        proxy.isHealthy
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                    )}
                >
                    {proxy.isHealthy ? "Healthy" : "Dead"}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-1 border border-white/5">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-gray-500">
                        <Hash className="w-3 h-3" />
                        Usage
                    </div>
                    <div className="text-sm font-bold text-white">
                        {proxy.usageCount.toLocaleString()}
                    </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-1 border border-white/5">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-gray-400">
                        <Activity className="w-3 h-3 text-primary" />
                        Status
                    </div>
                    <div className={cn(
                        "text-sm font-bold",
                        proxy.isHealthy ? "text-emerald-400" : "text-red-400"
                    )}>
                        {proxy.isHealthy ? "Active" : "Down"}
                    </div>
                </div>
            </div>

            {/* Remove Button */}
            <button
                onClick={handleRemove}
                disabled={isRemoving}
                className={cn(
                    "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                    confirmRemove
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                        : "bg-white/5 text-gray-400 border border-white/5 hover:bg-white/10 hover:text-white",
                    isRemoving && "opacity-50 cursor-not-allowed"
                )}
            >
                {isRemoving ? (
                    <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Removing...
                    </>
                ) : confirmRemove ? (
                    <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Confirm Removal
                    </>
                ) : (
                    <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Proxy
                    </>
                )}
            </button>
        </motion.div>
    );
}
