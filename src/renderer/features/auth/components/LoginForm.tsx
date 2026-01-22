/**
 * LoginForm Component
 */

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    Lock,
    AlertCircle,
    Loader2,
    ChevronRight,
    ShieldCheck,
} from "lucide-react";
import { LoginResponse } from "@core/types";
import { useAuth } from "../hooks/useAuth";

interface LoginFormProps {
    onSuccess: (response: LoginResponse) => void;
    onSwitchToRegister: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
    const { login } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email || !password) {
            setError("Email and password are required");
            return;
        }

        try {
            setIsLoading(true);
            const result = await login({ email, password });

            if (result.success) {
                onSuccess({
                    success: true,
                    sessionId: "app-session",
                    status: "authenticated",
                    message: "Login successful"
                });
            } else {
                setError(result.error || "Invalid credentials");
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <AnimatePresence mode="wait">
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start"
                    >
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400 font-medium">{error}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div
                layout
                className="glass-container rounded-[2.5rem] p-8 sm:p-10 relative overflow-hidden"
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                <div className="relative">
                    <div className="mb-8 text-center relative">
                        <div className="inline-flex p-3 rounded-2xl border bg-primary/10 border-primary/20 mb-4">
                            <Lock className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Sign in
                        </h2>
                        <p className="text-gray-400 text-sm">
                            Enter your credentials to manage sessions
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                Email Address
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all group-hover:border-white/20"
                                    autoFocus
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all group-hover:border-white/20"
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
                                className="px-10 py-3.5 rounded-2xl text-white font-bold text-sm uppercase tracking-widest relative overflow-hidden group/btn disabled:opacity-50 bg-primary shadow-[0_0_20px_rgba(129,140,248,0.3)]"
                            >
                                <span className="relative flex items-center justify-center gap-2">
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Login
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </span>
                            </motion.button>
                        </div>
                    </form>
                </div>
            </motion.div>

            <div className="mt-8 flex flex-col items-center justify-center gap-4">
                <button
                    onClick={onSwitchToRegister}
                    className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-primary transition-colors"
                >
                    Don't have an account? <span className="text-primary">Create one</span>
                </button>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600 text-[10px] uppercase tracking-widest font-bold">
                        End-to-end Encrypted
                    </span>
                </div>
            </div>
        </div>
    );
}
