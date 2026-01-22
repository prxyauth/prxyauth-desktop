/**
 * SubscriptionCard Component for Electron
 * Displays provider subscription details with premium styling
 */

import { motion } from "framer-motion";
import {
  Cloud,
  Github,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { ProviderLicense } from "@core/types";
import { cn } from "@core/utils";

interface SubscriptionCardProps {
  license: ProviderLicense;
  index?: number;
}

const providerConfig: Record<
  string,
  { name: string; icon: typeof Cloud; color: string; gradient: string }
> = {
  google: {
    name: "Google Cloud",
    icon: Cloud,
    color: "text-blue-400",
    gradient: "from-blue-500/20 to-blue-600/5",
  },
  office: {
    name: "Microsoft 365",
    icon: Mail,
    color: "text-orange-400",
    gradient: "from-orange-500/20 to-orange-600/5",
  },
  github: {
    name: "GitHub",
    icon: Github,
    color: "text-gray-400",
    gradient: "from-gray-500/20 to-gray-600/5",
  },
};

function getDaysRemaining(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SubscriptionCard({
  license,
  index = 0,
}: SubscriptionCardProps) {
  const config = providerConfig[license.provider] || providerConfig.google;
  const Icon = config.icon;
  const daysRemaining = getDaysRemaining(license.expiresAt);
  const isActive = license.status === "active" && daysRemaining > 0;
  const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl p-6 transition-all duration-300",
        "bg-linear-to-br",
        config.gradient,
        isActive
          ? "border-white/10 hover:border-white/20 hover:scale-[1.02] shadow-lg shadow-black/20"
          : "border-red-500/30 bg-red-500/5",
      )}
    >
      {/* Background glow effect */}
      <div
        className={cn(
          "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20",
          config.color.replace("text-", "bg-"),
        )}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              "bg-white/5 border border-white/10",
            )}
          >
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{config.name}</h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              {license.planType}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
            isActive
              ? isExpiringSoon
                ? "bg-orange-500/20 text-orange-400"
                : "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400",
          )}
        >
          {isActive ? (
            <>
              {isExpiringSoon ? (
                <AlertCircle className="w-3 h-3" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {isExpiringSoon ? "Expiring" : "Active"}
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" />
              Expired
            </>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5 relative z-10">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {isActive ? (
              <>
                <span className="text-white font-bold">{daysRemaining}</span>{" "}
                days left
              </>
            ) : (
              "Expired"
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 justify-end">
          <Calendar className="w-3.5 h-3.5" />
          <span className="font-medium">{formatDate(license.expiresAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}
