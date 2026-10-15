/**
 * ChallengeStep — 2FA / push-approval UI of the marketplace connect
 * wizard.
 */
import { FormEvent } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Loader2, RefreshCw, ShieldCheck, Smartphone, X } from "lucide-react";
import { cn } from "@core/utils";

interface ChallengeStepProps {
    provider: "GOOGLE" | "OFFICE" | "GITHUB";
    challengeType: string | null;
    challengeUI: { title: string; description: string; method: string };
    challengeMetadata: { availableMethods?: string[] } | null;
    twoFactorCode: string;
    isLoading: boolean;
    onCodeChange: (v: string) => void;
    onSubmit: (e: FormEvent) => void;
    onSwitchMethod: (method: string) => void;
    onCancel: () => void;
}

export function ChallengeStep({
    provider,
    challengeType,
    challengeUI,
    challengeMetadata,
    twoFactorCode,
    isLoading,
    onCodeChange,
    onSubmit,
    onSwitchMethod,
    onCancel,
}: ChallengeStepProps) {
    return (
        <motion.div
            key="2fa-step"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="relative"
        >
            <div className="mb-8 text-center">
                <div
                    className={cn(
                        "inline-flex p-4 rounded-3xl border mb-4",
                        challengeType === "PUSH" || challengeType === "APP"
                            ? "bg-amber-500/10 border-amber-500/20"
                            : "bg-primary/10 border-primary/20",
                    )}
                >
                    {challengeType === "PUSH" || challengeType === "APP" ? (
                        <Smartphone className="w-8 h-8 text-amber-400" />
                    ) : (
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    )}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{challengeUI.title}</h2>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">{challengeUI.description}</p>

                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        Method: {challengeUI.method}
                    </span>
                </div>
            </div>

            {challengeType === "PUSH" || challengeType === "APP" ? (
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-20 h-20 rounded-3xl border-2 border-amber-500/30 border-t-amber-500 animate-spin flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-amber-400 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">Waiting for approval...</p>
                </div>
            ) : (
                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                            Verification Code
                        </label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                            <input
                                type="text"
                                value={twoFactorCode}
                                onChange={(e) => onCodeChange(e.target.value)}
                                placeholder="Enter code"
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all group-hover:border-white/20 text-center text-2xl tracking-widest font-mono"
                                autoFocus
                                maxLength={8}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <div className="flex justify-center pt-4">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isLoading || !twoFactorCode}
                            className="px-10 py-3.5 rounded-2xl text-white font-bold text-sm uppercase tracking-widest relative overflow-hidden disabled:opacity-50 bg-primary shadow-[0_0_20px_rgba(129,140,248,0.3)]"
                        >
                            <span className="relative flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Verify
                                        <ChevronRight className="w-4 h-4" />
                                    </>
                                )}
                            </span>
                        </motion.button>
                    </div>
                </form>
            )}

            {provider === "GITHUB" && challengeMetadata?.availableMethods && (
                <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-4 text-center">
                        Switch Method
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {challengeMetadata.availableMethods.map((m: string) => (
                            <button
                                key={m}
                                onClick={() => onSwitchMethod(m)}
                                disabled={isLoading}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-all disabled:opacity-50"
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-center">
                <button
                    onClick={onCancel}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                    <X className="w-3 h-3" />
                    Cancel
                </button>
            </div>
        </motion.div>
    );
}
