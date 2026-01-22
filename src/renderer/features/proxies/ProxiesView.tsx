/**
 * ProxiesView - Main dashboard for proxy management
 */

import { useState } from "react";
import { Plus, Server, ShieldCheck, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { useProxies } from "./hooks/useProxies";
import { ProxyList, ProxyListSkeleton } from "./components/ProxyList";
import { AddProxyModal } from "./components/AddProxyModal";

export function ProxiesView() {
    const {
        stats,
        proxies,
        isLoading,
        error,
        add,
        remove,
        validate,
        isAdding,
        isRemoving,
        isValidating,
    } = useProxies();

    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="space-y-8 p-1">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Proxy Management</h1>
                    <p className="text-gray-500 uppercase tracking-[0.2em] font-black text-[10px] mt-1">Rotation Pool & Health Monitoring</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2.5 h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white transition-all shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Add Proxy</span>
                    </button>
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="mb-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-3">
                    <Activity className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-container rounded-[32px] p-6 flex items-center gap-5"
                >
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Server className="w-7 h-7 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Pooled</div>
                        <div className="text-3xl font-bold text-white">{stats?.total || 0}</div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-container rounded-[32px] p-6 flex items-center gap-5"
                >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <ShieldCheck className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Healthy</div>
                        <div className="text-3xl font-bold text-emerald-400">{stats?.healthy || 0}</div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-container rounded-[32px] p-6 flex items-center gap-5"
                >
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                        <Activity className="w-7 h-7 text-red-400" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">Unhealthy</div>
                        <div className="text-3xl font-bold text-red-500">{stats?.unhealthy || 0}</div>
                    </div>
                </motion.div>
            </div>

            {/* Proxy List */}
            {isLoading && !proxies.length ? (
                <ProxyListSkeleton />
            ) : (
                <ProxyList
                    proxies={proxies}
                    onRemove={remove}
                    isRemoving={isRemoving}
                />
            )}

            {/* Add Proxy Modal */}
            <AddProxyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={add}
                onValidate={validate}
                isAdding={isAdding}
                isValidating={isValidating}
            />
        </div>
    );
}
