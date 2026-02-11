/**
 * MarketplaceView - Infrastructure Marketplace for Electron
 */

import { billingApi } from "@core/api/client";
import { cn } from "@core/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
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
  Star,
} from "lucide-react";
import { useState } from "react";
import { ProvisioningModal } from "../../shared/components/ProvisioningModal";
import { MarketplaceLoginForm } from "./MarketplaceLoginForm";
import { useSubscriptions } from "../subscriptions/useSubscriptions";
import { SubscriptionCard } from "../subscriptions/SubscriptionCard";

const PROVIDERS = [
  {
    id: "GOOGLE",
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
    id: "OFFICE",
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
    id: "GITHUB",
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
      {/* Hero Section */}
      <div className="relative mb-16">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Infrastructure Pool Active
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase mb-6"
          >
            Cloud <span className="text-primary italic">Marketplace</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-500 max-w-2xl text-[11px] font-black uppercase tracking-[0.3em] leading-relaxed"
          >
            Deploy enterprise-grade infrastructure nodes across global regions
            with automated provisioning and stealth optimization.
          </motion.p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
        {[
          {
            label: "Active Nodes",
            value: "24/7",
            icon: Activity,
            color: "text-emerald-400",
          },
          {
            label: "Infrastructure",
            value: "Premium",
            icon: Globe,
            color: "text-primary",
          },
          {
            label: "Mesh Network",
            value: "Stealth",
            icon: ShieldCheck,
            color: "text-amber-400",
          },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-container rounded-[32px] p-8 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500 border-white/5"
          >
            <div
              className={cn(
                "absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity",
                stat.color,
              )}
            >
              <stat.icon className="w-16 h-16" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-3 ml-0.5">
              {stat.label}
            </p>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-4xl font-black tracking-tighter",
                  stat.color,
                )}
              >
                {stat.value}
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="wait">
          {!showConnect ? (
            PROVIDERS.map((p, idx) => {
              const license = subscriptions.find((s) => s.provider === p.id);
              const isLicensed = !!license && license.status === "ACTIVE";
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: idx * 0.1 }}
                  className={cn(
                    "relative group glass-container rounded-[40px] p-8 flex flex-col h-full border border-white/5 hover:border-primary/20 transition-all duration-500 overflow-hidden",
                    p.popular &&
                      !isLicensed &&
                      "border-primary/30 bg-primary/2",
                    isLicensed &&
                      "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.1)]",
                  )}
                >
                  {isLicensed && (
                    <div className="absolute top-6 right-6">
                      <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <ShieldCheck className="w-3 h-3" />
                        PRO License
                      </div>
                    </div>
                  )}

                  {p.popular && !isLicensed && (
                    <div className="absolute top-6 right-6">
                      <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(129,140,248,0.2)]">
                        <Star className="w-3 h-3 fill-primary" />
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Icon & Title */}
                  <div className="mb-8">
                    <div
                      className={cn(
                        "w-16 h-16 rounded-3xl border flex items-center justify-center mb-6 transition-all group-hover:scale-110 group-hover:rotate-3",
                        isLicensed
                          ? `bg-${p.color}/10 border-${p.color}/30 text-${p.color}`
                          : "bg-white/5 border-white/10 text-gray-500",
                      )}
                    >
                      <p.icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                      {p.name}
                    </h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                      {p.tagline}
                    </p>
                  </div>

                  {/* Description & Features */}
                  <div className="flex-1 space-y-6 mb-10">
                    <p className="text-sm text-gray-400 font-medium leading-relaxed">
                      {p.description}
                    </p>
                    <ul className="space-y-3">
                      {p.features.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-xs text-gray-400 font-medium"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500/60" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Controls */}
                  <div className="mt-auto space-y-3">
                    {isLicensed ? (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => {
                            setSelectedProvider(p.id);
                            setShowProvisioning(true);
                          }}
                          className="w-full relative group px-6 py-4 rounded-2xl text-[11px] font-black text-white overflow-hidden transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500"
                        >
                          Deploy Frontend
                          <Globe className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePurchase(p.id)}
                          disabled={isPurchasing === p.id}
                          className="w-full relative group px-6 py-3 rounded-2xl text-[9px] font-black text-white/60 hover:text-white overflow-hidden transition-all border border-white/5 hover:border-white/10 flex items-center justify-center gap-2 uppercase tracking-widest bg-white/5 hover:bg-white/10 disabled:opacity-50"
                        >
                          {isPurchasing === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              Renew / Extend License
                              <Clock className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handlePurchase(p.id)}
                        disabled={isPurchasing === p.id}
                        className="w-full relative group px-6 py-5 rounded-2xl text-[11px] font-black text-white overflow-hidden transition-all shadow-2xl flex items-center justify-center gap-3 uppercase tracking-widest bg-primary hover:bg-primary/90 hover:scale-[1.02] active:scale-95 group disabled:opacity-50"
                      >
                        {isPurchasing === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
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
                    (selectedProvider || "GOOGLE") as
                      | "GOOGLE"
                      | "OFFICE"
                      | "GITHUB"
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
