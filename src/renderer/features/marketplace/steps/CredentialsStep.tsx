/**
 * CredentialsStep — email (and GitHub password) forms of the marketplace
 * connect wizard, with the Google/Office password step.
 */
import { FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Database, Key, Loader2, Lock, Mail } from "lucide-react";
import { cn } from "@core/utils";

type Provider = "GOOGLE" | "OFFICE" | "GITHUB";

interface CredentialsStepProps {
    step: "provider" | "email" | "password";
    provider: Provider;
    email: string;
    password: string;
    isLoading: boolean;
    onEmailChange: (v: string) => void;
    onPasswordChange: (v: string) => void;
    onSubmitEmail: (e: FormEvent) => void;
    onSubmitPassword: (e: FormEvent) => void;
    onBackToProvider: () => void;
    onBackToEmail: () => void;
}

export function CredentialsStep({
    step,
    provider,
    email,
    password,
    isLoading,
    onEmailChange,
    onPasswordChange,
    onSubmitEmail,
    onSubmitPassword,
    onBackToProvider,
    onBackToEmail,
}: CredentialsStepProps) {
    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                {step === "email" ? (
                    <motion.div
                        key="email-step"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mb-8 text-center relative">
                            <button
                                onClick={onBackToProvider}
                                className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-white/5 text-gray-500 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 rotate-180" />
                            </button>
                            <div
                                className={cn(
                                    "inline-flex p-3 rounded-2xl border mb-4",
                                    provider === "GOOGLE"
                                        ? "bg-primary/10 border-primary/20"
                                        : provider === "OFFICE"
                                          ? "bg-emerald-500/10 border-emerald-500/20"
                                          : "bg-gray-500/10 border-gray-500/20",
                                )}
                            >
                                {provider === "GOOGLE" ? (
                                    <Mail className="w-6 h-6 text-primary" />
                                ) : provider === "OFFICE" ? (
                                    <Database className="w-6 h-6 text-emerald-500" />
                                ) : (
                                    <Key className="w-6 h-6 text-gray-400" />
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Sign in</h2>
                            <p className="text-gray-400 text-sm">
                                Use your{" "}
                                {provider === "GOOGLE"
                                    ? "Google"
                                    : provider === "OFFICE"
                                      ? "Microsoft"
                                      : "GITHUB"}{" "}
                                Account
                            </p>
                        </div>

                        <form
                            onSubmit={provider === "GITHUB" ? onSubmitEmail : onSubmitEmail}
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                    {provider === "GITHUB" ? "Username or email" : "Email or phone"}
                                </label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                                    <input
                                        type={provider === "GITHUB" ? "text" : "email"}
                                        value={email}
                                        onChange={(e) => onEmailChange(e.target.value)}
                                        placeholder={
                                            provider === "GITHUB"
                                                ? "Username or email address"
                                                : "Email address"
                                        }
                                        className={cn(
                                            "w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-all group-hover:border-white/20",
                                            provider === "GOOGLE"
                                                ? "focus:ring-primary/40 focus:border-primary/40"
                                                : provider === "OFFICE"
                                                  ? "focus:ring-emerald-500/40 focus:border-emerald-500/40"
                                                  : "focus:ring-gray-400/40 focus:border-gray-400/40",
                                        )}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {provider === "GITHUB" && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                        Password
                                    </label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-gray-400" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => onPasswordChange(e.target.value)}
                                            placeholder="Password"
                                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400/40 focus:border-gray-400/40 transition-all group-hover:border-white/20"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "px-8 py-3.5 rounded-2xl text-white font-bold text-sm uppercase tracking-widest relative overflow-hidden group/btn disabled:opacity-50",
                                        provider === "GOOGLE"
                                            ? "bg-primary shadow-[0_0_20px_rgba(129,140,248,0.3)]"
                                            : provider === "OFFICE"
                                              ? "bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                                              : "bg-gray-600 shadow-[0_0_20px_rgba(107,114,128,0.3)]",
                                    )}
                                >
                                    <span className="relative flex items-center justify-center gap-2">
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                {provider === "GITHUB" ? "Sign in" : "Next"}
                                                <ChevronRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </span>
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="password-step"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mb-8 text-center">
                            <div
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 cursor-pointer hover:bg-white/10 transition-colors"
                                onClick={onBackToEmail}
                            >
                                <div
                                    className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center",
                                        provider === "GOOGLE"
                                            ? "bg-primary/20"
                                            : "bg-emerald-500/20",
                                    )}
                                >
                                    {provider === "GOOGLE" ? (
                                        <Mail className="w-3 h-3 text-primary" />
                                    ) : (
                                        <Database className="w-3 h-3 text-emerald-500" />
                                    )}
                                </div>
                                <span className="text-xs font-medium text-gray-300">{email}</span>
                                <ChevronRight className="w-3 h-3 text-gray-500 rotate-180" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome</h2>
                        </div>

                        <form onSubmit={onSubmitPassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                    Password
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => onPasswordChange(e.target.value)}
                                        placeholder="Enter your password"
                                        className={cn(
                                            "w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 transition-all group-hover:border-white/20",
                                            provider === "GOOGLE"
                                                ? "focus:ring-primary/40 focus:border-primary/40"
                                                : "focus:ring-emerald-500/40 focus:border-emerald-500/40",
                                        )}
                                        autoFocus
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    type="submit"
                                    disabled={isLoading}
                                    className={cn(
                                        "px-8 py-3.5 rounded-2xl text-white font-bold text-sm uppercase tracking-widest relative overflow-hidden disabled:opacity-50",
                                        provider === "GOOGLE"
                                            ? "bg-primary shadow-[0_0_20px_rgba(129,140,248,0.3)]"
                                            : "bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
                                    )}
                                >
                                    <span className="relative flex items-center justify-center gap-2">
                                        {isLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                Sign in
                                                <ChevronRight className="w-4 h-4" />
                                            </>
                                        )}
                                    </span>
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
