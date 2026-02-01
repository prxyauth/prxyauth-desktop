import { billingApi } from "@core/api/client";
import { ProvisioningData } from "@core/types";
import { cn } from "@core/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  Globe,
  Loader2,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ProvisioningModalProps {
  isOpen: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
}

export function ProvisioningModal({
  isOpen,
  onClose,
  providerId,
  providerName,
}: ProvisioningModalProps) {
  const [data, setData] = useState<ProvisioningData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [userForkUrl, setUserForkUrl] = useState("");

  useEffect(() => {
    if (isOpen && providerId) {
      fetchData();
    }
  }, [isOpen, providerId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const result = await billingApi.getProvisioningData(providerId);
      setData(result);
    } catch (err) {
      console.error("Failed to fetch provisioning data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!isOpen) return null;

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
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">
                    Deploy {providerName} Frontend
                  </h2>
                  <p className="text-[8px] text-primary uppercase tracking-widest font-black mt-0.5">
                    Secure Provisioning Engine
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

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-6">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Generating credentials...
                  </p>
                </div>
              ) : data ? (
                <>
                  {/* Production Deployment (via Forking) */}
                  <section className="space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Zap className="w-3 h-3 fill-primary" />
                      Production Deployment
                    </h3>
                    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 shadow-inner">
                      <p className="text-xs text-gray-300 font-medium leading-relaxed">
                        Fork the repository to your GitHub account first, then
                        import to Vercel. This allows you to sync with upstream
                        updates.
                      </p>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-widest text-primary/70 ml-1">
                            Paste your Fork URL (Required for Step 2)
                          </label>
                          <input
                            type="text"
                            placeholder="https://github.com/your-username/repo"
                            value={userForkUrl}
                            onChange={(e) => setUserForkUrl(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors font-mono"
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              window.open(data.githubForkUrl, "_blank")
                            }
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-700 transition-all shadow-lg active:scale-95 group border border-white/10"
                          >
                            <span className="text-[8px]">1.</span>
                            Fork on GitHub
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                          <button
                            onClick={() => {
                              if (!userForkUrl) return;
                              const url = `${data.vercelImportUrl}&s=${encodeURIComponent(userForkUrl.trim())}`;
                              window.open(url, "_blank");
                            }}
                            className={cn(
                              "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 group border",
                              userForkUrl
                                ? "bg-white text-black hover:bg-primary border-white/10"
                                : "bg-zinc-800/50 text-white/30 cursor-not-allowed border-white/5",
                            )}
                          >
                            <span className="text-[8px]">2.</span>
                            Import to Vercel
                            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Add environment variables */}
                  <section className="space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <Cpu className="w-3 h-3" />
                      Add environment variables
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
                  </section>
                </>
              ) : (
                <div className="py-10 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
                    <X className="w-6 h-6" />
                  </div>
                  <h3 className="text-white font-black uppercase tracking-widest text-xs">
                    Generation Failed
                  </h3>
                  <p className="text-[10px] text-gray-400 max-w-xs mx-auto">
                    Could not generate provisioning data.
                  </p>
                  <button
                    onClick={fetchData}
                    className="px-5 py-2 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/10 border border-white/10"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end items-center gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-600 mr-auto">
                Encrypted Provisioning Active
              </span>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-primary text-[9px] font-black uppercase tracking-widest text-white hover:bg-primary/80 transition-all shadow-lg"
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
