import { billingApi } from "@core/api/client";
import { ProvisioningData } from "@core/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Cpu,
  Download,
  Globe,
  Loader2,
  Package,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
}

type BuildState = "idle" | "building" | "done" | "error";

export function ProvisioningModal({
  isOpen,
  onClose,
  providerId,
  providerName,
}: ProvisioningModalProps) {
  const [data, setData] = useState<ProvisioningData | null>(null);
  const [buildState, setBuildState] = useState<BuildState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Start the build whenever the modal opens
  useEffect(() => {
    if (isOpen && providerId) {
      startBuild();
    }
    // Reset when closed
    if (!isOpen) {
      setData(null);
      setBuildState("idle");
      setErrorMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, providerId]);

  const startBuild = async () => {
    try {
      setBuildState("building");
      setErrorMsg(null);
      const result = await billingApi.getProvisioningData(providerId);
      setData(result);
      setBuildState("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to build frontend";
      setErrorMsg(msg);
      setBuildState("error");
      console.error("Provisioning build failed", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-[#050505] rounded-[32px] p-0 shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(129,140,248,0.2)]">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">
                    Deploy {providerName} Frontend
                  </h2>
                  <p className="text-[8px] text-primary uppercase tracking-widest font-black mt-0.5">
                    Build &amp; Download Engine
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[65vh] overflow-y-auto custom-scrollbar space-y-6">
              {/* ── Build Status ── */}
              <BuildStatusCard
                state={buildState}
                cached={data?.cached}
                errorMsg={errorMsg}
                onRetry={startBuild}
                downloadUrl={data?.downloadUrl}
                providerName={providerName}
              />

              {/* ── Env Variables (shown once build is done) ── */}
              {buildState === "done" && data && (
                <motion.section
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Cpu className="w-3 h-3" />
                    Your Secret Connection Keys (already inside your download)
                  </h3>
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="space-y-3">
                      {data.envContent
                        .split("\n")
                        .filter((line) => line.trim() !== "")
                        .map((line, index) => {
                          const [key, ...valueParts] = line.split("=");
                          const value = valueParts
                            .join("=")
                            .replace(/^"(.*)"$/, "$1");
                          const id = `env-${index}`;

                          return (
                            <div
                              key={id}
                              className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
                                  {key}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(value, id)}
                                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all flex items-center gap-1.5 text-[8px] font-black"
                                >
                                  {copied === id ? (
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  {copied === id ? "COPIED" : "COPY VALUE"}
                                </button>
                              </div>
                              <div className="bg-zinc-900/30 p-2 rounded-lg text-[10px] text-emerald-400/50 font-mono break-all line-clamp-1">
                                {value}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </motion.section>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end items-center gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-600 mr-auto">
                Secure Automated Setup
              </span>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Status Card
// ─────────────────────────────────────────────────────────────────────────────

interface BuildStatusCardProps {
  state: BuildState;
  cached?: boolean;
  errorMsg?: string | null;
  downloadUrl?: string;
  providerName: string;
  onRetry: () => void;
}

function BuildStatusCard({
  state,
  cached,
  errorMsg,
  downloadUrl,
  providerName,
  onRetry,
}: BuildStatusCardProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const copyLink = () => {
    if (!downloadUrl) return;
    navigator.clipboard.writeText(downloadUrl).catch(console.error);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  if (state === "idle") return null;

  if (state === "building") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-primary/5 p-8 flex flex-col items-center gap-5 text-center"
      >
        {/* Animated build indicator */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <motion.div
            className="absolute -inset-2 rounded-3xl border border-primary/20"
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>

        <div className="space-y-2">
          <p className="text-white font-black text-sm uppercase tracking-widest">
            Building your app…
          </p>
          <p className="text-gray-500 text-xs font-medium leading-relaxed max-w-xs">
            Preparing your {providerName} login page and packing it up for you. This usually takes about 30–60 seconds.
          </p>
        </div>

        {/* Build progress steps */}
        <div className="w-full max-w-xs space-y-2">
          {[
            "Fetching the latest design",
            "Adding your unique access keys",
            "Building your ready-to-use application",
            "Preparing your secure download link",
          ].map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.4 }}
              className="flex items-center gap-3"
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
              />
              <span className="text-[10px] text-gray-500 font-medium">{step}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (state === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-center gap-4 text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <div className="space-y-1">
          <p className="text-white font-black text-sm uppercase tracking-widest">Build Failed</p>
          <p className="text-red-400/80 text-xs font-medium max-w-xs">
            {errorMsg || "An unexpected error occurred during the build."}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all"
        >
          Retry Build
        </button>
      </motion.div>
    );
  }

  // state === "done"
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-black text-sm uppercase tracking-widest">
            {cached ? "Cached Build Ready" : "Build Complete!"}
          </p>
          <p className="text-[8px] text-emerald-400 uppercase tracking-widest font-black mt-0.5">
            {cached
              ? "Served instantly from secure storage"
              : "Your custom app is packaged and ready"}
          </p>
        </div>
        {!cached && (
          <div className="ml-auto">
            <div className="px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              Fresh
            </div>
          </div>
        )}
      </div>

      {downloadUrl ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 leading-relaxed font-medium">
            Your <span className="text-white font-black">{providerName}</span> login page is fully
            set up and securely connected to your account. Just download the ZIP file below, and follow the simple 
            instructions inside to run it on your own computer or server.
          </p>

          <a
            href={downloadUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95"
          >
            <Download className="w-4 h-4" />
            Download ZIP
          </a>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[8px] text-gray-600 font-black uppercase tracking-widest">
              or copy link
            </span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <button
            onClick={copyLink}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-all group"
          >
            <Globe className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
            <span className="text-[9px] text-gray-600 font-mono truncate group-hover:text-gray-400 transition-colors">
              {downloadUrl}
            </span>
            <div className="ml-auto shrink-0">
              {linkCopied ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-gray-600 group-hover:text-gray-400 transition-colors" />
              )}
            </div>
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 font-medium leading-relaxed">
          Your app is ready, but the download link isn't configured yet. You can still use the credentials below to set it up manually.
        </p>
      )}
    </motion.div>
  );
}
