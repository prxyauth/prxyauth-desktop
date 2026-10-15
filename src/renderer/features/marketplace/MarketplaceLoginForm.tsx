/**
 * MarketplaceLoginForm — the connect wizard state machine. All flow
 * logic (initiate -> password -> 2FA -> success) lives here; the visual
 * steps are separate components under ./steps/.
 */

import { FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { ApiError } from "@core/api/client";
import { SessionStatus, LoginResponse } from "@core/types";
import { getBrowserFingerprint } from "@core/utils";
import {
    useConnectAccount,
    useSessionAuthPolling,
} from "@features/sessions/hooks/useConnectAccount";
import { ProviderStep } from "./steps/ProviderStep";
import { CredentialsStep } from "./steps/CredentialsStep";
import { ChallengeStep } from "./steps/ChallengeStep";
import { getChallengeDisplayName } from "./steps/challenge-display";

interface MarketplaceLoginFormProps {
    provider: "GOOGLE" | "OFFICE" | "GITHUB";
    licenses: string[];
    onSuccess: (response: LoginResponse) => void;
    onBack: () => void;
    onPurchase: (providerId: string) => Promise<void>;
}

export function MarketplaceLoginForm({
    provider: initialProvider,
    licenses,
    onSuccess,
    onBack,
    onPurchase,
}: MarketplaceLoginFormProps) {
    const [provider, setProvider] = useState<"GOOGLE" | "OFFICE" | "GITHUB">(initialProvider);
    const { initiate, submitPassword: connectPassword, submit2FA, switch2FA } = useConnectAccount();
    const pollSessionAuth = useSessionAuthPolling();
    const [step, setStep] = useState<"provider" | "email" | "password">("provider");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [twoFactorCode, setTwoFactorCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [backendMessage, setBackendMessage] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
    const [challengeType, setChallengeType] = useState<LoginResponse["challengeType"] | null>(null);
    const [challengeMetadata, setChallengeMetadata] = useState<any>(null);

    // Provider dispatch lives in the shared useConnectAccount hook.

    const handleContinue = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email) {
            setError("Email is required");
            return;
        }

        try {
            setIsLoading(true);
            const fingerprint = getBrowserFingerprint();
            const response = await initiate.mutateAsync({ provider, email, fingerprint });

            if (response.success && response.sessionId) {
                setSessionId(response.sessionId);
                setStep("password");
            } else {
                setError(response.error || response.message || "Failed to initiate login");
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setError((err.data as any)?.message || err.message);
            } else {
                setError("An unexpected error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!password) {
            setError("Password is required");
            return;
        }

        if (!sessionId) {
            setError("Session expired. Please start over.");
            setStep("email");
            return;
        }

        try {
            setIsLoading(true);
            const response = await connectPassword.mutateAsync({
                provider,
                sessionId,
                email,
                password,
                fingerprint: undefined,
            });

            if (response.success) {
                if (response.challengeType) {
                    setSessionId(response.sessionId || sessionId);
                    setChallengeType(response.challengeType);
                    setChallengeMetadata(response.challengeMetadata);
                    setBackendMessage(response.message);
                    setError(null);

                    if (response.challengeType === "PUSH" || response.challengeType === "APP") {
                        handle2FASubmit(undefined, response.sessionId || sessionId, response.challengeType);
                    }
                } else {
                    onSuccess(response);
                }
            }
        } catch (err) {
            if (err instanceof ApiError && err.data && (err.data as any).challengeType) {
                const data = err.data as any;
                if (data.sessionId) setSessionId(data.sessionId || sessionId);
                if (data.challengeType) setChallengeType(data.challengeType);
                if (data.challengeMetadata) setChallengeMetadata(data.challengeMetadata);

                const backendMsg = data.message || data.error || err.message;
                setBackendMessage(backendMsg);

                if (data.challengeType === "PUSH" || data.challengeType === "APP") {
                    handle2FASubmit(undefined, data.sessionId || sessionId, data.challengeType);
                }
            } else if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGithubLogin = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!email) {
            setError("Username or email is required");
            return;
        }

        if (!password) {
            setError("Password is required");
            return;
        }

        try {
            setIsLoading(true);
            const fingerprint = getBrowserFingerprint();
            const response = await connectPassword.mutateAsync({
                provider: "GITHUB",
                sessionId: "",
                email,
                password,
                fingerprint,
            });

            if (response.success) {
                if (response.challengeType) {
                    setSessionId(response.sessionId || null);
                    setChallengeType(response.challengeType);
                    setChallengeMetadata(response.challengeMetadata);
                    setBackendMessage(response.message);
                    setError(null);

                    if (response.challengeType === "PUSH" || response.challengeType === "APP") {
                        handle2FASubmit(undefined, response.sessionId, response.challengeType);
                    }
                } else {
                    onSuccess(response);
                }
            }
        } catch (err) {
            if (err instanceof ApiError && err.data && (err.data as any).challengeType) {
                const data = err.data as any;
                setSessionId(data.sessionId);
                setChallengeType(data.challengeType);
                setChallengeMetadata(data.challengeMetadata);
                setError(null);

                const backendMsg = data.message || data.error || err.message;
                setBackendMessage(backendMsg);

                if (data.challengeType === "PUSH" || data.challengeType === "APP") {
                    handle2FASubmit(undefined, data.sessionId, data.challengeType);
                }
            } else if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError("An unexpected error occurred");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitchMethod = async (method: string) => {
        if (!sessionId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await switch2FA.mutateAsync({ provider: "GITHUB", sessionId, method });
            if (data.challengeType) {
                setChallengeType(data.challengeType);
                setChallengeMetadata(data.challengeMetadata);
                setBackendMessage(data.message);
                setError(null);
            }
            setTwoFactorCode("");
        } catch (err) {
            if (err instanceof ApiError && err.data && (err.data as any).challengeType) {
                const data = err.data as any;
                setChallengeType(data.challengeType);
                setChallengeMetadata(data.challengeMetadata);
                setBackendMessage(data.message || data.error || err.message);
                setTwoFactorCode("");
            } else if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError("Failed to switch method");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async (
        e?: FormEvent,
        overrideSessionId?: string,
        passedType?: LoginResponse["challengeType"],
    ) => {
        if (e) e.preventDefault();
        const activeSessionId = overrideSessionId || sessionId;
        const activeType = passedType || challengeType;

        if (!activeSessionId) return;

        setError(null);
        setIsLoading(true);

        try {
            const response = await submit2FA.mutateAsync({
                provider,
                sessionId: activeSessionId,
                code: (activeType === "PUSH" || activeType === "APP" ? undefined : twoFactorCode) ?? "",
            });

            if (response.success) {
                if (response.challengeType) {
                    setChallengeType(response.challengeType);
                    setChallengeMetadata(response.challengeMetadata);
                    setBackendMessage(response.message);
                    setError(null);

                    if (response.challengeType === "PUSH" || response.challengeType === "APP") {
                        setTimeout(() => {
                            handle2FASubmit(undefined, activeSessionId, response.challengeType);
                        }, 2000);
                    }
                } else {
                    setIsLoading(false);
                    onSuccess(response);
                }
            }
        } catch (err) {
            if (err instanceof ApiError && err.data && (err.data as any).challengeType) {
                const data = err.data as any;
                const currentType = data.challengeType;
                const currentMsg = data.error || err.message;

                setChallengeType(currentType);
                setChallengeMetadata(data.challengeMetadata);
                setBackendMessage(currentMsg);

                if (currentType === "PUSH" || currentType === "APP") {
                    setTimeout(() => {
                        handle2FASubmit(undefined, activeSessionId, currentType);
                    }, 2000);
                    return;
                }
                setIsLoading(false);
            } else if (err instanceof ApiError) {
                setIsLoading(false);
                setError(err.message);
            } else {
                setIsLoading(false);
                setError("Verification failed unexpectedly");
            }
        }
    };

    const handlePurchase = async (p: string) => {
        try {
            setIsPurchasing(p);
            await onPurchase(p);
        } finally {
            setIsPurchasing(null);
        }
    };

    // 2FA Polling logic for PUSH/APP challenges
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        if (
            challengeType &&
            (challengeType === "PUSH" || challengeType === "APP") &&
            sessionId
        ) {
            pollInterval = setInterval(async () => {
                try {
                    const authenticated = await pollSessionAuth(sessionId);
                    if (authenticated) {
                        onSuccess({
                            success: true,
                            sessionId,
                            status: SessionStatus.AUTHENTICATED,
                            message: "Authentication successful",
                        });
                    }
                } catch (err) {
                    console.warn("Polling error:", err);
                }
            }, 3000);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [challengeType, sessionId, onSuccess]);

    const is2FAMode = !!challengeType;
    const challengeUI = getChallengeDisplayName(challengeType || null, provider, backendMessage);

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
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />

                <AnimatePresence mode="wait">
                    {!is2FAMode && step === "provider" ? (
                        <ProviderStep
                            licenses={licenses}
                            isPurchasing={isPurchasing}
                            onSelect={(p) => {
                                setProvider(p);
                                setStep("email");
                            }}
                            onPurchase={handlePurchase}
                            onBack={onBack}
                        />
                    ) : !is2FAMode ? (
                        <CredentialsStep
                            step={step}
                            provider={provider}
                            email={email}
                            password={password}
                            isLoading={isLoading}
                            onEmailChange={setEmail}
                            onPasswordChange={setPassword}
                            onSubmitEmail={provider === "GITHUB" ? handleGithubLogin : handleContinue}
                            onSubmitPassword={handleSubmit}
                            onBackToProvider={() => setStep("provider")}
                            onBackToEmail={() => setStep("email")}
                        />
                    ) : (
                        <ChallengeStep
                            provider={provider}
                            challengeType={challengeType || null}
                            challengeUI={challengeUI}
                            challengeMetadata={challengeMetadata}
                            twoFactorCode={twoFactorCode}
                            isLoading={isLoading}
                            onCodeChange={setTwoFactorCode}
                            onSubmit={handle2FASubmit}
                            onSwitchMethod={handleSwitchMethod}
                            onCancel={() => {
                                setChallengeType(null);
                                setChallengeMetadata(null);
                                setTwoFactorCode("");
                                setStep("email");
                            }}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
