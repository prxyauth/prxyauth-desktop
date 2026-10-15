/**
 * ProviderStep — choose-provider card grid (step 1 of the marketplace
 * connect wizard).
 */
import { motion } from "framer-motion";
import { ChevronRight, Database, Key, Layers, Loader2, Lock, Mail } from "lucide-react";
import { cn } from "@core/utils";

interface ProviderStepProps {
    licenses: string[];
    isPurchasing: string | null;
    onSelect: (provider: "GOOGLE" | "OFFICE" | "GITHUB") => void;
    onPurchase: (providerId: string) => void;
    onBack: () => void;
}

export function ProviderStep({ licenses, isPurchasing, onSelect, onPurchase, onBack }: ProviderStepProps) {
    return (
        <motion.div
            key="provider-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="relative"
        >
            <div className="mb-10 text-center">
                <div className="inline-flex p-3 rounded-2xl bg-white/5 border border-white/10 mb-4">
                    <Layers className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Choose Provider</h2>
                <p className="text-gray-400 text-sm">Select your authentication source</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {[
                    {
                        id: "GOOGLE",
                        name: "Google Cloud",
                        desc: "Gmail, Workspace, GCP",
                        icon: Mail,
                        color: "primary",
                    },
                    {
                        id: "OFFICE",
                        name: "Microsoft 365",
                        desc: "Office 365, Outlook, Azure",
                        icon: Database,
                        color: "emerald-500",
                    },
                    {
                        id: "GITHUB",
                        name: "GITHUB",
                        desc: "Repositories, Actions, Copilot",
                        icon: Key,
                        color: "gray-400",
                    },
                ].map((p) => {
                    const isLicensed = licenses.includes(p.id);
                    const Icon = p.icon;
                    return (
                        <div key={p.id} className="relative">
                            <button
                                onClick={() => {
                                    if (isLicensed) {
                                        onSelect(p.id as "GOOGLE" | "OFFICE" | "GITHUB");
                                    }
                                }}
                                className={cn(
                                    "w-full group relative p-6 rounded-3xl bg-white/5 border border-white/10 transition-all text-left flex items-center gap-5",
                                    isLicensed
                                        ? `hover:border-${p.color}/40 hover:bg-white/8`
                                        : "opacity-60 grayscale cursor-default",
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform",
                                        isLicensed
                                            ? `bg-${p.color}/10 border-${p.color}/20 group-hover:scale-110`
                                            : "bg-white/5 border-white/10",
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "w-6 h-6",
                                            isLicensed ? `text-${p.color}` : "text-gray-600",
                                        )}
                                    />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-white font-bold flex items-center gap-2">
                                        {p.name}
                                        {!isLicensed && <Lock className="w-3 h-3 text-gray-500" />}
                                    </h3>
                                    <p className="text-xs text-gray-500">{p.desc}</p>
                                </div>
                                {isLicensed ? (
                                    <ChevronRight className="w-5 h-5 ml-auto text-gray-600 transition-transform group-hover:translate-x-1" />
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onPurchase(p.id);
                                        }}
                                        disabled={isPurchasing === p.id}
                                        className="ml-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2"
                                    >
                                        {isPurchasing === p.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            "Buy Monthly"
                                        )}
                                    </motion.button>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8 flex justify-center">
                <button
                    onClick={onBack}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to Marketplace
                </button>
            </div>
        </motion.div>
    );
}
