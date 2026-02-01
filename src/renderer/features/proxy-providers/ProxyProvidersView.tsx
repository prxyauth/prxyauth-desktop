import { useState } from "react";
import {
  Plus,
  Layers,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useProxyProviders } from "./hooks/useProxyProviders";
import { ProxyProviderCard } from "./components/ProxyProviderCard";
import { ProxyProviderModal } from "./components/ProxyProviderModal";
import { ProxyProviderConfig } from "@core/types";
import { cn } from "@core/utils";

export function ProxyProvidersView() {
  const {
    providers,
    isLoading,
    error,
    isSaving,
    isRemoving,
    isTesting,
    testResult,
    refresh,
    save,
    remove,
    toggle,
    test,
  } = useProxyProviders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] =
    useState<ProxyProviderConfig | null>(null);

  const handleAdd = () => {
    setEditingProvider(null);
    setIsModalOpen(true);
  };

  const handleEdit = (provider: ProxyProviderConfig) => {
    setEditingProvider(provider);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 p-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
            Proxy <span className="text-primary italic">Providers</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-[0.25em] font-black text-[10px] mt-3 flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Rotation Pool Infrastructure
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="flex items-center gap-2.5 h-12 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 group"
          >
            <RefreshCw
              className={cn(
                "w-4 h-4 text-primary transition-transform duration-500",
                isLoading && "animate-spin",
              )}
            />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Sync
            </span>
          </button>

          <button
            onClick={handleAdd}
            className="flex items-center gap-2.5 h-12 px-6 rounded-2xl bg-primary hover:bg-primary/90 text-white transition-all shadow-[0_0_20px_rgba(129,140,248,0.3)] group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
              Connect Provider
            </span>
          </button>
        </div>
      </div>

      {/* Global Alerts / Test Results */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="p-4 rounded-[24px] bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}
        {/* Premium Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {[
            {
              label: "Total Providers",
              value: providers.length,
              icon: Layers,
              color: "text-blue-400",
            },
            {
              label: "Active Networks",
              value: providers.filter((p) => p.isEnabled).length,
              icon: ShieldCheck,
              color: "text-emerald-400",
            },
            {
              label: "System Health",
              value: "100%",
              icon: Zap,
              color: "text-amber-400",
            },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-container rounded-[32px] p-8 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 border-white/5"
            >
              <div
                className={cn(
                  "absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity",
                  stat.color,
                )}
              >
                <stat.icon className="w-16 h-16" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 ml-0.5">
                {stat.label}
              </p>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "text-4xl font-black tracking-tighter",
                    stat.color,
                  )}
                >
                  {stat.value}
                </span>
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              </div>
            </motion.div>
          ))}
        </div>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className={cn(
              "p-5 rounded-[24px] border flex flex-col md:flex-row md:items-center justify-between gap-4",
              testResult.success
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-red-400",
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border",
                  testResult.success
                    ? "bg-emerald-500/20 border-emerald-500/30"
                    : "bg-red-500/20 border-red-500/30",
                )}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">
                  Test Result: {testResult.provider}
                </h4>
                <p className="text-sm font-bold">
                  {testResult.success
                    ? `Successfully established link. Outbound IP: ${testResult.ip}`
                    : `Connection failed: ${testResult.error}`}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Providers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {providers.map((provider) => (
            <ProxyProviderCard
              key={provider.id}
              provider={provider}
              onEdit={handleEdit}
              onRemove={remove}
              onToggle={toggle}
              onTest={test}
              isTesting={isTesting === provider.provider}
              isRemoving={isRemoving === provider.provider}
            />
          ))}
        </AnimatePresence>

        {/* Empty State / Add Suggestion */}
        {!isLoading && providers.length < 3 && (
          <motion.button
            layout
            onClick={handleAdd}
            className="glass-container rounded-[32px] p-8 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4 group/add"
          >
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 group-hover/add:text-primary group-hover/add:bg-primary/10 group-hover/add:border-primary/20 transition-all">
              <Plus className="w-8 h-8 group-hover/add:rotate-90 transition-transform" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Connect New Node
              </h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mt-1">
                Expand your rotation pool capacity
              </p>
            </div>
          </motion.button>
        )}
      </div>

      {/* Loading State */}
      {isLoading && providers.length === 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="glass-container rounded-[32px] h-[340px] animate-pulse bg-white/5"
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ProxyProviderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={save}
        provider={editingProvider}
        isSaving={isSaving}
      />
    </div>
  );
}
