/**
 * MarketplaceView - Infrastructure Marketplace for Electron
 */

import { billingApi } from "@core/api/client";
import { cn } from "@core/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Database,
  Globe,
  Key,
  Loader2,
  Mail,
  ShieldCheck,
  ShoppingBag,
  Star,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { ProvisioningModal } from "../../shared/components/ProvisioningModal";
import { MarketplaceLoginForm } from "./MarketplaceLoginForm";
import { useSubscriptions } from "../subscriptions/useSubscriptions";
import { SubscriptionCard } from "../subscriptions/SubscriptionCard";

const PROVIDERS = [
  {
    id: "google",
    name: "Google Cloud",
    tagline: "Gmail, Workspace, GCP",
    description:
      "Enterprise-grade automation for Google accounts. Securely manage Gmail, Sheets, and more with proprietary stealth bypass.",
    icon: Mail,
    color: "primary",
    features: [
      "Bypass Google Workspace 2FA",
      "Encrypted Session Storage",
      "Headless/Headed Modes",
    ],
    popular: true,
  },
  {
    id: "office",
    name: "Microsoft 365",
    tagline: "Office 365, Outlook, Azure",
    description:
      "Seamlessly automate Microsoft ecosystems. Perfect for Outlook automation, Azure management, and SharePoint tasks.",
    icon: Database,
    color: "emerald-400",
    features: [
      "Active Directory Support",
      "Persistent Sessions",
      "Custom Fingerprinting",
    ],
  },
  {
    id: "github",
    name: "GitHub PRO",
    tagline: "Repositories, Actions, Copilot",
    description:
      "Advanced automation for developer workflows. Manage repositories, secrets, and actions without triggering security alerts.",
    icon: Key,
    color: "gray-400",
    features: [
      "MFA Bypass Protection",
      "Websocket Tunneling",
      "High-Concurrency Support",
    ],
  },
];

interface MarketplaceViewProps {
  onNavigateToPayment: (transactionId: string) => void;
}

export function MarketplaceView({ onNavigateToPayment }: MarketplaceViewProps) {
  const { subscriptions, refresh: fetchLicenses } = useSubscriptions();
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [showProvisioning, setShowProvisioning] = useState(false);

  const handlePurchase = async (p: string) => {
    try {
      setIsPurchasing(p);

      const response = await billingApi.checkout({
        provider: p,
        durationMonths: 1,
        paymentMethod: "tron", // Always use TRON by default
      });

      if (response.success && response.data) {
        if (response.data.paymentUrl.startsWith("tron:")) {
          onNavigateToPayment(response.data.transactionId);
        } else if (response.data.paymentUrl) {
          // In Electron, we open in a new browser window for external URLs
          window.open(response.data.paymentUrl, "_blank");
        } else {
          await fetchLicenses();
        }
      }
    } catch (err) {
      console.error("Purchase failed", err);
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleLoginSuccess = () => {
    setShowConnect(false);
    setSelectedProvider(null);
    // Navigate back to sessions or refresh
    window.location.reload();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 p-4">
      {/* Hero Header */}
      <section className="text-center space-y-4 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mb-2"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          The Infrastructure Marketplace
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase"
        >
          Expand Your <span className="text-primary italic">Network</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-500 max-w-2xl mx-auto text-xs font-medium leading-relaxed"
        >
          Purchase enterprise-grade automation licenses and deploy secure
          browser workers. Each provider is isolated and uses proprietary
          encryption.
        </motion.p>
      </section>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Globe, label: "Global Nodes", val: "1.2k+" },
          { icon: Zap, label: "Avg Latency", val: "45ms" },
          { icon: ShieldCheck, label: "Security Score", val: "99.9%" },
          { icon: Clock, label: "Uptime", val: "24/7" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.05 }}
            className="glass-container p-4 rounded-3xl flex flex-col items-center justify-center text-center gap-1 border border-white/5"
          >
            <s.icon className="w-4 h-4 text-primary/60 mb-1" />
            <span className="text-lg font-black text-white">{s.val}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-gray-500">
              {s.label}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Your Subscriptions Section */}
      {subscriptions.length > 0 && !showConnect && (
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_10px_var(--primary-glow)]" />
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
              Your Subscriptions
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subscriptions.map((license, idx) => (
              <SubscriptionCard
                key={license.provider}
                license={license}
                index={idx}
              />
            ))}
          </div>
        </section>
      )}

      {/* Provider Marketplace Head */}
      {!showConnect && (
        <div className="flex items-center gap-3 pt-4">
          <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_10px_var(--primary-glow)]" />
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase">
            Available Infrastructure
          </h2>
        </div>
      )}

      {/* Provider Marketplace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="wait">
          {!showConnect ? (
            PROVIDERS.map((p, idx) => {
              const license = subscriptions.find((s) => s.provider === p.id);
              const isLicensed = !!license && license.status === "active";
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "relative group glass-container rounded-[32px] p-6 flex flex-col h-full border border-white/5 hover:border-primary/20 transition-all duration-500",
                    p.popular &&
                      !isLicensed &&
                      "border-primary/20 bg-primary/5",
                    isLicensed &&
                      "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]",
                  )}
                >
                  {isLicensed && (
                    <div className="absolute top-4 right-4">
                      <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[7.5px] font-black uppercase tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        PRO
                      </div>
                    </div>
                  )}

                  {p.popular && !isLicensed && (
                    <div className="absolute top-4 right-4">
                      <div className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[7.5px] font-black uppercase tracking-widest flex items-center gap-1 shadow-[0_0_10px_rgba(129,140,248,0.2)]">
                        <Star className="w-2.5 h-2.5 fill-primary" />
                        POPULAR
                      </div>
                    </div>
                  )}

                  {/* Icon & Title */}
                  <div className="mb-6">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl border flex items-center justify-center mb-4 transition-all group-hover:scale-110",
                        isLicensed
                          ? `bg-${p.color}/10 border-${p.color}/30 text-${p.color}`
                          : "bg-white/5 border-white/10 text-gray-500",
                      )}
                    >
                      <p.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">
                      {p.name}
                    </h3>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                      {p.tagline}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4">
                    {p.description}
                  </p>

                  {/* Features */}
                  <ul className="flex-1 space-y-2 mb-8">
                    {p.features.map((f, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-2 text-[10px] text-gray-400 font-medium"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Controls */}
                  <div className="mt-auto space-y-2">
                    {isLicensed ? (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setSelectedProvider(p.id);
                            setShowProvisioning(true);
                          }}
                          className="w-full relative group px-4 py-2.5 rounded-xl text-[9px] font-black text-white overflow-hidden transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500"
                        >
                          Deploy Frontend
                          <Globe className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handlePurchase(p.id)}
                          disabled={isPurchasing === p.id}
                          className="w-full relative group px-4 py-2 rounded-xl text-[8px] font-black text-white/50 hover:text-white transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-2 uppercase tracking-widest bg-white/5 hover:bg-white/10 disabled:opacity-50"
                        >
                          {isPurchasing === p.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              Renew License
                              <Clock className="w-3 h-3" />
                            </>
                          )}
                        </button>
                        {/* <button
                          onClick={() => {
                            setSelectedProvider(p.id);
                            setShowConnect(true);
                          }}
                          className="w-full relative group px-4 py-2 rounded-xl text-[8px] font-black text-white/30 hover:text-white overflow-hidden transition-all border border-dashed border-white/5 hover:border-white/20 flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-white/5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connect Session
                        </button> */}
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(p.id)}
                        disabled={isPurchasing === p.id}
                        className="w-full relative group px-4 py-3 rounded-xl text-[10px] font-black text-white overflow-hidden transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest bg-primary hover:bg-primary/80 disabled:opacity-50"
                      >
                        {isPurchasing === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            Buy License
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          ) : (
            <motion.div
              key="connect-flow"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="lg:col-span-3 flex flex-col items-center py-6"
            >
              <div className="w-full max-w-md">
                <button
                  onClick={() => setShowConnect(false)}
                  className="mb-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  Back to Marketplace
                </button>

                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">
                    Connect{" "}
                    {PROVIDERS.find((p) => p.id === selectedProvider)?.name}
                  </h2>
                  <p className="text-[10px] text-gray-500 font-medium tracking-tight uppercase">
                    Deploy a new automation worker
                  </p>
                </div>

                <MarketplaceLoginForm
                  provider={
                    (selectedProvider || "google") as
                      | "google"
                      | "office"
                      | "github"
                  }
                  licenses={subscriptions.map((s) => s.provider)}
                  onSuccess={handleLoginSuccess}
                  onBack={() => setShowConnect(false)}
                  onPurchase={handlePurchase}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProvisioningModal
        isOpen={showProvisioning}
        onClose={() => setShowProvisioning(false)}
        providerId={selectedProvider || ""}
        providerName={
          PROVIDERS.find((p) => p.id === selectedProvider)?.name || ""
        }
      />

      {/* Footer */}
      <footer className="pt-10 text-center border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">
          Enterprise Node Network
        </p>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600 max-w-md mx-auto leading-relaxed">
          Proprietary stealth technology ensures 99.9% undetected automation.
          All connections are encrypted with AES-256-GCM at the edge.
        </p>
      </footer>
    </div>
  );
}
