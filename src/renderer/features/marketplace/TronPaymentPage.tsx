"use client";

import { billingApi } from "@core/api/client";
import { CheckoutResponseData } from "@core/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

interface TronPaymentPageProps {
  transactionId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export function TronPaymentPage({
  transactionId,
  onBack,
  onSuccess,
}: TronPaymentPageProps) {
  const [checkoutData, setCheckoutData] = useState<
    (CheckoutResponseData & { amount: number }) | null
  >(null);
  const [copied, setCopied] = useState<"address" | "amount" | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [status, setStatus] = useState<
    "PENDING" | "PAID" | "FAILED" | "EXPIRED"
  >("PENDING");
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const response = await billingApi.getTransaction(transactionId);
        if (response.success && response.data) {
          setCheckoutData(response.data as any);
          if (response.data.status === "PAID") setStatus("PAID");
          else if (response.data.status === "EXPIRED") setStatus("EXPIRED");
        }
      } catch (err) {
        console.error("Failed to fetch transaction", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
  }, [transactionId]);

  // Countdown logic
  useEffect(() => {
    if (!checkoutData?.expiresAt || status !== "PENDING") return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(checkoutData.expiresAt!).getTime() - now;

      if (distance < 0) {
        setStatus("EXPIRED");
        setTimeLeft("00:00");
        clearInterval(timer);
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [checkoutData, status]);

  // Polling logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checkoutData && status === "PENDING") {
      interval = setInterval(async () => {
        try {
          const result = await billingApi.verifyPayment(transactionId);
          if (result.status === "PAID") {
            setStatus("PAID");
            clearInterval(interval);
          } else if (result.status === "EXPIRED") {
            setStatus("EXPIRED");
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Polling failed", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [checkoutData, status, transactionId]);

  const copyToClipboard = (text: string, type: "address" | "amount") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const manualVerify = async () => {
    try {
      setIsVerifying(true);
      const result = await billingApi.verifyPayment(transactionId);
      if (result.status === "PAID") {
        setStatus("PAID");
      }
    } catch (err) {
      console.error("Manual verification failed", err);
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <h1 className="text-xl font-black text-white uppercase">
          Transaction Not Found
        </h1>
        <button
          onClick={onBack}
          className="text-primary hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </button>
      </div>
    );
  }

  const address = checkoutData.paymentUrl.split(":")[1].split("?")[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-3 text-gray-500 hover:text-white transition-all group"
      >
        <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          Back to Marketplace
        </span>
      </button>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/[0.01] border border-white/10 rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_40px_rgba(129,140,248,0.1)] ring-1 ring-white/5">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">
                Vault Settlement
              </h1>
              <p className="text-[9px] text-primary uppercase tracking-[0.3em] font-black opacity-80">
                Secured by TRON • USDT TRC20
              </p>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">
              Status
            </p>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  status === "PAID"
                    ? "bg-emerald-500 animate-pulse"
                    : status === "EXPIRED"
                      ? "bg-red-500"
                      : "bg-primary animate-pulse",
                )}
              />
              <span className="text-[11px] font-black text-white uppercase tracking-widest">
                {status === "PAID"
                  ? "Confirmed"
                  : status === "EXPIRED"
                    ? "Expired"
                    : "Pending"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-10">
          <AnimatePresence mode="wait">
            {status === "PAID" ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-8"
              >
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="w-12 h-12" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-black text-white uppercase tracking-tighter">
                    Settled
                  </h2>
                  <p className="text-[11px] text-gray-400 font-medium max-w-xs mx-auto leading-relaxed">
                    Payment of{" "}
                    <span className="text-white">
                      {checkoutData.amount} USDT
                    </span>{" "}
                    confirmed. Access to{" "}
                    <span className="text-primary uppercase font-black">
                      {checkoutData.provider}
                    </span>{" "}
                    is active.
                  </p>
                </div>
                <button
                  onClick={onSuccess}
                  className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] text-[10px] px-12 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(129,140,248,0.2)] hover:scale-105"
                >
                  Return to Dashboard
                </button>
              </motion.div>
            ) : status === "EXPIRED" ? (
              <motion.div
                key="expired"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <Clock className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                    Invoice Expired
                  </h2>
                  <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                    This window has closed. Please go back and retry.
                  </p>
                </div>
                <button
                  onClick={onBack}
                  className="bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[9px] px-8 py-3 rounded-xl border border-white/10"
                >
                  New Transaction
                </button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-5 gap-12">
                <div className="col-span-3 space-y-8">
                  {/* Amount Card */}
                  <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-emerald-500/10 rounded-[32px] blur-xl opacity-0 hover:opacity-100 transition-opacity" />
                    <div className="relative p-8 rounded-[32px] bg-white/[0.02] border border-white/10 space-y-3">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em] text-gray-500">
                        <span>Total to Deposit</span>
                        {timeLeft && (
                          <span className="text-primary font-black italic">
                            Expires in {timeLeft}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-5xl font-black text-white tracking-tighter tabular-nums">
                          {checkoutData.amount}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-primary">
                            USDT
                          </span>
                          <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">
                            TRC20 Network
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              checkoutData.amount.toString(),
                              "amount",
                            )
                          }
                          className="ml-auto p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-all"
                        >
                          {copied === "amount" ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Address Block */}
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 ml-4">
                      Receiver Address
                    </p>
                    <div className="group relative">
                      <div className="w-full bg-white/[0.01] border border-white/5 rounded-[24px] p-6 text-[11px] text-gray-300 font-mono break-all leading-snug transition-all group-hover:bg-white/[0.03] group-hover:border-white/10">
                        {address}
                      </div>
                      <button
                        onClick={() => copyToClipboard(address, "address")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                      >
                        {copied === "address" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Active Monitoring */}
                  <div className="flex items-center gap-4 p-6 rounded-[24px] bg-primary/5 border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-10" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none mb-1.5">
                        Live Tracking
                      </p>
                      <p className="text-[9px] text-gray-500 leading-tight">
                        Blockchain settlement is being verified in real-time.
                      </p>
                    </div>
                  </div>
                </div>

                {/* QR Sidebar */}
                <div className="col-span-2 flex flex-col gap-6">
                  <div className="bg-white p-8 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] ring-4 ring-white/[0.02]">
                    <QRCodeSVG
                      value={checkoutData.paymentUrl}
                      size={100}
                      width="100%"
                      height="auto"
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <button
                    onClick={manualVerify}
                    disabled={isVerifying}
                    className="w-full group flex items-center justify-between px-6 py-4 rounded-[20px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all disabled:opacity-50"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] font-black text-white uppercase tracking-widest leading-none mb-1">
                        Verify Manual
                      </span>
                      <span className="text-[8px] text-gray-500 font-medium">
                        Click if already sent
                      </span>
                    </div>
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                    )}
                  </button>

                  <p className="text-[8px] text-center text-gray-600 font-medium leading-relaxed px-4">
                    Supports any TRON wallet (TronLink, Trust Wallet, etc.)
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Warning */}
        <div className="px-8 py-4 border-t border-white/5 bg-black/40">
          <div className="flex items-center justify-center gap-3 text-red-500/80">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em]">
              Critical: Only deposit USDT via TRON (TRC20)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
