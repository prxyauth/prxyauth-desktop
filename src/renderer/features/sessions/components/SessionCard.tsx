/**
 * SessionCard Component
 */

import {
  Shield,
  Clock,
  Trash2,
  RefreshCw,
  Mail,
  Database,
  Key,
  Zap,
  Fingerprint as FingerprintIcon,
  Globe,
  Home,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Session } from "@core/types";
import { cn } from "@core/utils";
import { StatusBadge } from "@shared/components/ui/StatusBadge";
import { ConfirmationModal } from "@shared/components/ui/ConfirmationModal";

interface SessionCardProps {
  session: Session;
  onLogout: (sessionId: string) => Promise<boolean>;
  isLoggingOut: boolean;
  onVerify: (sessionId: string) => Promise<boolean>;
  isVerifying: boolean;
  onDetail?: (sessionId: string) => void;
  onLaunchBrowser: (sessionId: string) => void;
  onCloseBrowser?: (sessionId: string) => void;
  onShowPortal?: (sessionId: string) => void;
  isClosing?: boolean;
  transitionData?: { status: string; logs: string[] };
  isBrowserOpen?: boolean;
  variant?: "grid" | "list";
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProviderInfo(provider?: string) {
  switch (provider) {
    case "GOOGLE":
      return { name: "Google", color: "text-primary", Icon: Mail };
    case "OFFICE":
      return {
        name: "Microsoft 365",
        color: "text-emerald-500",
        Icon: Database,
      };
    case "GITHUB":
      return { name: "GitHub", color: "text-gray-400", Icon: Key };
    case "FACEBOOK":
      return { name: "Facebook", color: "text-primary", Icon: Mail };
    default:
      return { name: "Unknown", color: "text-gray-400", Icon: Key };
  }
}

export function SessionCard({
  session,
  onLogout,
  isLoggingOut,
  onVerify,
  isVerifying,
  onDetail,
  onLaunchBrowser,
  onCloseBrowser,
  onShowPortal,
  isClosing,
  transitionData,
  isBrowserOpen,
  variant = "grid",
}: SessionCardProps) {
  const providerInfo = getProviderInfo(session.provider);
  const ProviderIcon = providerInfo.Icon;
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleLogoutClick = () => {
    setShowConfirmLogout(true);
  };

  const handleConfirmLogout = async () => {
    setShowConfirmLogout(false);
    await onLogout(session.id);
  };

  if (variant === "list") {
    return (
      <div className="group glass-container rounded-2xl p-3 glass-card-hover relative overflow-hidden flex items-center gap-6 border border-white/5 hover:border-primary/20 transition-all">
        {/* ID Column */}
        <div className="w-12 shrink-0 flex flex-col items-center">
          <span className="text-[10px] font-mono text-gray-500 group-hover:text-primary/60 transition-colors">
            {session.id.slice(-4).toUpperCase()}
          </span>
          <ProviderIcon className={cn("w-3 h-3 mt-1", providerInfo.color)} />
        </div>

        {/* Account Column */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-white truncate max-w-[240px] group-hover:text-primary transition-colors">
              {session.email}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-widest",
                  providerInfo.color,
                )}
              >
                {providerInfo.name}
              </span>
              <span className="text-[9px] text-gray-600 font-mono">
                • {formatDate(session.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Proxy Column */}
        <div className="hidden lg:flex w-48 shrink-0 flex-col">
          {session.proxy?.externalIp ? (
            <>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary/80">
                <Globe className="w-3 h-3" />
                <span>{session.proxy.externalIp}</span>
              </div>
              <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5 truncate">
                {session.proxy.city || "Unknown"},{" "}
                {session.proxy.country || "Secure"}
              </span>
            </>
          ) : (
            <span className="text-[10px] text-gray-600 italic">No Proxy</span>
          )}
        </div>

        {/* Status/Transition Column */}
        <div className="hidden xl:flex w-48 shrink-0 flex-col justify-center">
          {transitionData ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                  {transitionData.status}
                </span>
              </div>
              {transitionData.logs.length > 0 && (
                <p className="text-[8px] text-gray-500 font-mono truncate pl-3.5">
                  {transitionData.logs[transitionData.logs.length - 1]}
                </p>
              )}
            </div>
          ) : (
            <StatusBadge status={session.status} size="sm" />
          )}
        </div>

        {/* Operations Column */}
        <div className="w-64 shrink-0 flex items-center justify-end gap-2">
          <button
            onClick={() => onVerify(session.id)}
            disabled={isVerifying || isLoggingOut}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-primary/30"
            title="Verify Session"
          >
            {isVerifying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 text-emerald-500" />
            )}
          </button>

          {onDetail && (
            <button
              onClick={() => onDetail(session.id)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-primary/30"
              title="Session Details"
            >
              <FingerprintIcon className="w-4 h-4 text-primary" />
            </button>
          )}

          {isBrowserOpen && onShowPortal && (
            <button
              onClick={() => onShowPortal(session.id)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/5 hover:border-primary/30"
              title="Return to Portal"
            >
              <Home className="w-4 h-4 text-primary" />
            </button>
          )}

          {isBrowserOpen ? (
            <button
              onClick={() => onCloseBrowser?.(session.id)}
              disabled={!!transitionData || isClosing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest transition-all border border-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transitionData || isClosing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Stop
            </button>
          ) : (
            <button
              onClick={() => onLaunchBrowser(session.id)}
              disabled={!!transitionData}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transitionData ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 fill-white" />
              )}
              Launch
            </button>
          )}

          <button
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className="p-2.5 rounded-xl text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
            title="Terminate"
          >
            {isLoggingOut ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>

        <ConfirmationModal
          isOpen={showConfirmLogout}
          onClose={() => setShowConfirmLogout(false)}
          onConfirm={handleConfirmLogout}
          title="Terminate Connection"
          message={`Are you sure you want to terminate the connection for ${session.email}?`}
          confirmLabel="Terminate"
          variant="danger"
        />
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="group glass-container rounded-[32px] p-6 glass-card-hover relative overflow-hidden h-full flex flex-col border border-white/5 hover:border-primary/30 transition-colors"
    >
      {/* Premium glass effects primitives */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none z-0" />
      <div className="absolute inset-[1px] bg-black/40 rounded-[inherit] pointer-events-none backdrop-blur-xl z-0" />

      {/* Decorative gradient corner */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/30 transition-colors duration-500 z-0" />
      <div className="absolute -bottom-12 -left-12 w-24 h-24 bg-primary/5 blur-3xl rounded-full z-0" />

      {/* System Check Overlay during launch */}
      <AnimatePresence>
        {transitionData && !isBrowserOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col p-6 items-center justify-center text-center space-y-6"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <Zap className="absolute inset-0 m-auto w-6 h-6 text-primary animate-pulse fill-primary" />
            </div>

            <div className="space-y-4 w-full">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-[0.2em]">
                  {transitionData.status}
                </h4>
                <div className="w-12 h-1 bg-primary/20 mx-auto mt-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1.5 max-h-32 overflow-hidden">
                {transitionData.logs.map((log, i) => (
                  <motion.div
                    key={`${i}-${log}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "text-[9px] font-mono tracking-tight",
                      i === transitionData.logs.length - 1
                        ? "text-primary font-bold"
                        : "text-gray-500/60",
                    )}
                  >
                    <span className="opacity-40 mr-2">›</span>
                    {log}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 space-y-6 flex flex-col relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <ProviderIcon className={cn("w-3.5 h-3.5", providerInfo.color)} />
              <span
                className={cn(
                  "text-[9px] font-black uppercase tracking-[0.25em]",
                  providerInfo.color,
                )}
              >
                {providerInfo.name}
              </span>
            </div>
            <h3 className="text-xl font-black text-white truncate group-hover:text-primary transition-colors leading-tight">
              {session.email}
            </h3>
          </div>
          <StatusBadge status={session.status} size="sm" />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 gap-4 py-1">
          <div className="flex items-center gap-3 group/info">
            <div className="p-2.5 rounded-xl bg-white/5 text-gray-500 group-hover/info:bg-primary/10 group-hover/info:text-primary transition-colors">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                Established
              </p>
              <p className="text-sm font-bold text-gray-300">
                {formatDate(session.createdAt)}
              </p>
            </div>
          </div>
          {session.proxy?.externalIp && (
            <div className="flex items-center gap-3 group/info">
              <div className="p-2.5 rounded-xl bg-white/5 text-gray-500 group-hover/info:bg-primary/10 group-hover/info:text-primary transition-colors">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0.5">
                  Secure IP
                </p>
                <p className="text-sm font-bold text-primary/80">
                  {session.proxy.externalIp}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <div className="space-y-3 pt-6 border-t border-white/5">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onVerify(session.id)}
              disabled={isVerifying || isLoggingOut}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5 hover:border-primary/20 disabled:opacity-50"
            >
              {isVerifying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-primary" />
              )}
              Verify
            </button>

            {onDetail && (
              <button
                onClick={() => onDetail(session.id)}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5 group/btn hover:border-primary/20"
              >
                <FingerprintIcon className="w-3.5 h-3.5 text-primary group-hover/btn:scale-110 transition-transform" />
                Details
              </button>
            )}
          </div>

          {isBrowserOpen && onShowPortal && (
            <button
              onClick={() => onShowPortal(session.id)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5 hover:border-primary/20"
            >
              <Home className="w-3.5 h-3.5 text-primary" />
              Return to Portal
            </button>
          )}

          {isBrowserOpen ? (
            <button
              onClick={() => onCloseBrowser?.(session.id)}
              disabled={!!transitionData || isClosing}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_10px_20px_rgba(249,115,22,0.25)] hover:shadow-[0_15px_30px_rgba(249,115,22,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transitionData || isClosing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {transitionData?.status || "Stop Browser"}
            </button>
          ) : (
            <button
              onClick={() => onLaunchBrowser(session.id)}
              disabled={!!transitionData}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-[0_10px_20px_rgba(129,140,248,0.25)] hover:shadow-[0_15px_30px_rgba(129,140,248,0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transitionData ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 fill-white" />
              )}
              Launch Browser
            </button>
          )}

          <button
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            {isLoggingOut ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            Terminate
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        onConfirm={handleConfirmLogout}
        title="Terminate Connection"
        message={`Are you sure you want to terminate the connection for ${session.email}? This will end the current session.`}
        confirmLabel="Terminate"
        variant="danger"
      />
    </motion.div>
  );
}
