/**
 * StatusBadge Component
 */

import { SessionStatus } from "@core/types";
import { cn } from "@core/utils";

interface StatusBadgeProps {
  status: SessionStatus | "authenticating";
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  [SessionStatus.AUTHENTICATED]: {
    label: "Active",
    className:
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(52,211,153,0.3)]",
  },
  [SessionStatus.PENDING]: {
    label: "Pending",
    className:
      "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_20px_-5px_rgba(251,191,36,0.2)]",
  },
  [SessionStatus.STALE]: {
    label: "Stale",
    className:
      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 shadow-[0_0_20px_-5px_rgba(234,179,8,0.2)]",
  },
  [SessionStatus.REQUIRES_2FA]: {
    label: "Verify Required",
    className:
      "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_20px_-5px_rgba(251,146,60,0.3)]",
  },
  [SessionStatus.FAILED]: {
    label: "Failed",
    className:
      "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]",
  },
  [SessionStatus.EXPIRED]: {
    label: "Expired",
    className: "bg-white/5 text-gray-500 border-white/10",
  },
  [SessionStatus.AUTHENTICATING]: {
    label: "Authenticating",
    className:
      "bg-primary/10 text-primary border-primary/20 animate-pulse shadow-[0_0_20px_-5px_var(--primary-glow)]",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.failed;

  return (
    <span
      className={cn(
        "inline-flex items-center font-black uppercase tracking-[0.15em] rounded-full border transition-all",
        size === "sm" ? "px-2.5 py-1 text-[9px]" : "px-3.5 py-1.5 text-[11px]",
        config.className,
      )}
    >
      <span className="w-1 h-1 rounded-full bg-current mr-2 shadow-[0_0_5px_currentColor]" />
      {config.label}
    </span>
  );
}
