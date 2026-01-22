/**
 * ProxyList - Grid display for multiple proxies
 */

import { motion, AnimatePresence } from "framer-motion";
import { Server } from "lucide-react";
import { ProxyHealthInfo } from "@core/types";
import { ProxyCard } from "./ProxyCard";

interface ProxyListProps {
    proxies: ProxyHealthInfo[];
    onRemove: (server: string) => Promise<boolean>;
    isRemoving: string | null;
}

export function ProxyList({ proxies, onRemove, isRemoving }: ProxyListProps) {
    if (proxies.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 px-6 text-center"
            >
                <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <Server className="w-10 h-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No proxies in pool</h3>
                <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed">
                    Add proxies to the pool to enable automated rotation and stealth features.
                </p>
            </motion.div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
                {proxies.map((proxy) => (
                    <ProxyCard
                        key={proxy.server}
                        proxy={proxy}
                        onRemove={onRemove}
                        isRemoving={isRemoving === proxy.server}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

export function ProxyListSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="glass-container rounded-[24px] p-6 h-[240px] animate-pulse">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-white/5" />
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-white/5 rounded" />
                            <div className="h-3 w-20 bg-white/5 rounded" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="h-16 bg-white/5 rounded-xl" />
                        <div className="h-16 bg-white/5 rounded-xl" />
                    </div>
                    <div className="h-10 bg-white/5 rounded-xl" />
                </div>
            ))}
        </div>
    );
}
