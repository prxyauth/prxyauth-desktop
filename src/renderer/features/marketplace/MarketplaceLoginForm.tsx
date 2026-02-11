/**
 * MarketplaceLoginForm Component
 * Multi-step authentication form for marketplace session connection
 */

import {
  ApiError,
  githubApi,
  googleApi,
  officeApi,
  sessionApi,
} from "@core/api/client";
import { LoginResponse, SessionStatus } from "@core/types";
import { cn } from "@core/utils";
import { getBrowserFingerprint } from "@core/utils/fingerprint";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronRight,
  Database,
  Key,
  Layers,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

interface MarketplaceLoginFormProps {
  provider: "GOOGLE" | "OFFICE" | "GITHUB";
  licenses: string[];
  onSuccess: (response: LoginResponse) => void;
  onBack: () => void;
  onPurchase: (provider: string) => Promise<void>;
}

export function MarketplaceLoginForm({
  provider: initialProvider,
  licenses,
  onSuccess,
  onBack,
  onPurchase,
}: MarketplaceLoginFormProps) {
  const [provider, setProvider] = useState<"GOOGLE" | "OFFICE" | "GITHUB">(
    initialProvider,
  );
  const [step, setStep] = useState<"provider" | "email" | "password">(
    "provider",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [challengeType, setChallengeType] = useState<
    LoginResponse["challengeType"] | null
  >(null);
  const [challengeMetadata, setChallengeMetadata] = useState<any>(null);

  const api =
    provider === "GOOGLE"
      ? googleApi
      : provider === "OFFICE"
        ? officeApi
        : null;

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
      const response = await api!.initiateLogin({ email, fingerprint });

      if (response.success && response.sessionId) {
        setSessionId(response.sessionId);
        setStep("password");
      } else {
        setError(
          response.error || response.message || "Failed to initiate login",
        );
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
      const response = await api!.submitPassword({ sessionId, password });

      if (response.success) {
        if (response.challengeType) {
          setSessionId(response.sessionId || sessionId);
          setChallengeType(response.challengeType);
          setChallengeMetadata(response.challengeMetadata);
          setBackendMessage(response.message);
          setError(null);

          if (
            response.challengeType === "PUSH" ||
            response.challengeType === "APP"
          ) {
            handle2FASubmit(
              undefined,
              response.sessionId || sessionId,
              response.challengeType,
              response.message,
            );
          }
        } else {
          onSuccess(response);
        }
      }
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.data &&
        (err.data as any).challengeType
      ) {
        const data = err.data as any;
        if (data.sessionId) setSessionId(data.sessionId || sessionId);
        if (data.challengeType) setChallengeType(data.challengeType);
        if (data.challengeMetadata)
          setChallengeMetadata(data.challengeMetadata);

        const backendMsg = data.message || data.error || err.message;
        setBackendMessage(backendMsg);

        if (data.challengeType === "PUSH" || data.challengeType === "APP") {
          handle2FASubmit(
            undefined,
            data.sessionId || sessionId,
            data.challengeType,
            backendMsg,
          );
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
      const response = await githubApi.login({
        username: email,
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

          if (
            response.challengeType === "PUSH" ||
            response.challengeType === "APP"
          ) {
            handle2FASubmit(
              undefined,
              response.sessionId,
              response.challengeType,
              response.message,
            );
          }
        } else {
          onSuccess(response);
        }
      }
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.data &&
        (err.data as any).challengeType
      ) {
        const data = err.data as any;
        setSessionId(data.sessionId);
        setChallengeType(data.challengeType);
        setChallengeMetadata(data.challengeMetadata);
        setError(null);

        const backendMsg = data.message || data.error || err.message;
        setBackendMessage(backendMsg);

        if (data.challengeType === "PUSH" || data.challengeType === "APP") {
          handle2FASubmit(
            undefined,
            data.sessionId,
            data.challengeType,
            backendMsg,
          );
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
      const data = await githubApi.switch2FA({ sessionId, method });
      if (data.challengeType) {
        setChallengeType(data.challengeType);
        setChallengeMetadata(data.challengeMetadata);
        setBackendMessage(data.message);
        setError(null);
      }
      setTwoFactorCode("");
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.data &&
        (err.data as any).challengeType
      ) {
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
    passedMessage?: string,
  ) => {
    if (e) e.preventDefault();
    console.log(passedMessage);
    const activeSessionId = overrideSessionId || sessionId;
    const activeType = passedType || challengeType;

    if (!activeSessionId) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await (api || githubApi).submit2FA({
        sessionId: activeSessionId,
        code:
          activeType === "PUSH" || activeType === "APP"
            ? undefined
            : twoFactorCode,
      });

      if (response.success) {
        if (response.challengeType) {
          setChallengeType(response.challengeType);
          setChallengeMetadata(response.challengeMetadata);
          setBackendMessage(response.message);
          setError(null);

          if (
            response.challengeType === "PUSH" ||
            response.challengeType === "APP"
          ) {
            setTimeout(() => {
              handle2FASubmit(
                undefined,
                activeSessionId,
                response.challengeType,
                response.message,
              );
            }, 2000);
          }
        } else {
          setIsLoading(false);
          onSuccess(response);
        }
      }
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.data &&
        (err.data as any).challengeType
      ) {
        const data = err.data as any;
        const currentType = data.challengeType;
        const currentMsg = data.error || err.message;

        setChallengeType(currentType);
        setChallengeMetadata(data.challengeMetadata);
        setBackendMessage(currentMsg);

        if (currentType === "PUSH" || currentType === "APP") {
          setTimeout(() => {
            handle2FASubmit(
              undefined,
              activeSessionId,
              currentType,
              currentMsg,
            );
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

  const handlePurchase = async (p: "GOOGLE" | "OFFICE" | "GITHUB") => {
    try {
      setIsPurchasing(p);
      await onPurchase(p);
    } finally {
      setIsPurchasing(null);
    }
  };

  // 2FA Polling logic for PUSH/APP challenges
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    const is2FAMode = !!challengeType;

    if (
      is2FAMode &&
      (challengeType === "PUSH" || challengeType === "APP") &&
      sessionId
    ) {
      pollInterval = setInterval(async () => {
        try {
          const session = await sessionApi.get(sessionId);
          if (session && session.status === SessionStatus.AUTHENTICATED) {
            onSuccess({
              success: true,
              sessionId: session.id,
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

  const getChallengeDisplayName = (
    type: string | null,
    prov: string,
    message?: string | null,
  ) => {
    const isGithub = prov === "GITHUB";
    const isOffice = prov === "OFFICE";

    switch (type) {
      case "PUSH":
        return {
          title: isGithub ? "Check GitHub Mobile" : "Check your phone",
          description:
            message ||
            (isGithub
              ? "We sent a request to your GitHub Mobile app. Enter the digits shown to verify."
              : isOffice
                ? "Open your Microsoft Authenticator app to approve the request."
                : "Check your phone and tap 'Yes' on the Google prompt."),
          method: isGithub
            ? "GitHub Mobile"
            : isOffice
              ? "Authenticator App"
              : "Google Prompt",
        };
      case "EMAIL":
        return {
          title: "Check your email",
          description:
            message || "Verification required to protect your account",
          method: "Email Code",
        };
      case "BACKUP":
      case "RECOVERY_CODE":
        return {
          title: "Recovery Code",
          description: message || "Enter one of your 8-digit backup codes",
          method: "Recovery Code",
        };
      case "TOTP":
      case "APP":
        return {
          title: "Two-factor auth",
          description: message || "Enter the code from your Authenticator app",
          method: "Authenticator App",
        };
      case "SMS":
        return {
          title: "Verify your phone",
          description: message || "Enter the code sent to your phone",
          method: "SMS / Text Message",
        };
      default:
        return {
          title: "Two-factor auth",
          description:
            message || "Verification required to protect your account",
          method: type || "Verification Code",
        };
    }
  };

  const is2FAMode = !!challengeType;
  const challengeUI = getChallengeDisplayName(
    challengeType || null,
    provider,
    backendMessage,
  );

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
          {step === "provider" ? (
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
                <h2 className="text-2xl font-bold text-white mb-2">
                  Choose Provider
                </h2>
                <p className="text-gray-400 text-sm">
                  Select your authentication source
                </p>
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
                            setProvider(p.id as any);
                            setStep("email");
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
                            {!isLicensed && (
                              <Lock className="w-3 h-3 text-gray-500" />
                            )}
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
                              handlePurchase(p.id as any);
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
          ) : !is2FAMode ? (
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
                        onClick={() => setStep("provider")}
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
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Sign in
                      </h2>
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
                      onSubmit={
                        provider === "GITHUB"
                          ? handleGithubLogin
                          : handleContinue
                      }
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                          {provider === "GITHUB"
                            ? "Username or email"
                            : "Email or phone"}
                        </label>
                        <div className="relative group">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                          <input
                            type={provider === "GITHUB" ? "text" : "email"}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                              onChange={(e) => setPassword(e.target.value)}
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
                        onClick={() => setStep("email")}
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
                        <span className="text-xs font-medium text-gray-300">
                          {email}
                        </span>
                        <ChevronRight className="w-3 h-3 text-gray-500 rotate-180" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Welcome
                      </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
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
          ) : (
            // 2FA Flow
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
                <h2 className="text-2xl font-bold text-white mb-2">
                  {challengeUI.title}
                </h2>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                  {challengeUI.description}
                </p>

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
                  <p className="text-xs text-gray-500 font-medium">
                    Waiting for approval...
                  </p>
                </div>
              ) : (
                <form onSubmit={handle2FASubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500 ml-1">
                      Verification Code
                    </label>
                    <div className="relative group">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors group-focus-within:text-primary" />
                      <input
                        type="text"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value)}
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
                        onClick={() => handleSwitchMethod(m)}
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
                  onClick={() => {
                    setChallengeType(null);
                    setChallengeMetadata(null);
                    setTwoFactorCode("");
                    setStep("email");
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
