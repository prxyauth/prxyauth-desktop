import { useState, useEffect } from "react";
import { billingApi } from "@core/api/client";
import { ProviderLicense, Transaction } from "@core/types";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CreditCard, X, ExternalLink } from "lucide-react";

interface NotificationItem {
  id: string;
  type: "warning" | "info";
  message: React.ReactNode;
  icon: React.ElementType;
}

interface NotificationBannerProps {
  onNavigateToMarketplace: () => void;
  onNavigateToPayment: (transactionId: string) => void;
}

export function NotificationBanner({ onNavigateToMarketplace, onNavigateToPayment }: NotificationBannerProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load dismissed notifications from session storage to avoid annoying the user on every page load
    const storedDismissed = sessionStorage.getItem("dismissed_notifications");
    if (storedDismissed) {
      try {
        setDismissedIds(new Set(JSON.parse(storedDismissed)));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [licenses, transactions] = await Promise.all([
          billingApi.listLicenses().catch(() => []),
          billingApi.listTransactions().catch(() => []),
        ]);

        const newNotifications: NotificationItem[] = [];
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        // Check for expiring licenses
        licenses.forEach((license: ProviderLicense) => {
          if (license.expiresAt) {
            const expiryDate = new Date(license.expiresAt);
            if (license.status === "ACTIVE") {
              if (expiryDate <= sevenDaysFromNow && expiryDate > now) {
                const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                const id = `exp-${license.provider}-${license.expiresAt}`;
                if (!dismissedIds.has(id)) {
                  newNotifications.push({
                    id,
                    type: "warning",
                    icon: AlertCircle,
                    message: (
                      <span>
                        Your <strong>{license.provider}</strong> subscription expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}.
                        <button onClick={onNavigateToMarketplace} className="ml-2 underline font-bold hover:text-white">Renew now</button>
                      </span>
                    ),
                  });
                }
              } else if (expiryDate <= now) {
                  const id = `expired-${license.provider}-${license.expiresAt}`;
                  if (!dismissedIds.has(id)) {
                    newNotifications.push({
                      id,
                      type: "warning",
                      icon: AlertCircle,
                      message: (
                        <span>
                          Your <strong>{license.provider}</strong> subscription has expired.
                          <button onClick={onNavigateToMarketplace} className="ml-2 underline font-bold hover:text-white">Renew now</button>
                        </span>
                      ),
                    });
                  }
              }
            } else if (license.status === "EXPIRED") {
                const id = `expired-${license.provider}-${license.expiresAt}`;
                if (!dismissedIds.has(id)) {
                  newNotifications.push({
                    id,
                    type: "warning",
                    icon: AlertCircle,
                    message: (
                      <span>
                        Your <strong>{license.provider}</strong> subscription has expired.
                        <button onClick={onNavigateToMarketplace} className="ml-2 underline font-bold hover:text-white">Renew now</button>
                      </span>
                    ),
                  });
                }
            }
          }
        });

        // Check for pending transactions
        transactions.forEach((tx: Transaction) => {
          if (tx.status === "PENDING") {
            const id = `tx-${tx.id}`;
            if (!dismissedIds.has(id)) {
              newNotifications.push({
                id,
                type: "info",
                icon: CreditCard,
                message: (
                  <span>
                    You have a pending payment of {tx.amount} {tx.currency} for {tx.provider}.
                    <button onClick={() => onNavigateToPayment(tx.id)} className="ml-2 underline font-bold hover:text-white inline-flex items-center">
                       Complete Payment <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </span>
                ),
              });
            }
          }
        });

        setNotifications(newNotifications);
        if (newNotifications.length > 0) {
          setIsVisible(true);
        } else {
            setIsVisible(false);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [dismissedIds, onNavigateToMarketplace, onNavigateToPayment]);

  // Auto-rotate if multiple notifications
  useEffect(() => {
    if (notifications.length > 1 && isVisible) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % notifications.length);
      }, 5000); // rotate every 5 seconds
      return () => clearInterval(interval);
    }
  }, [notifications.length, isVisible]);

  const handleDismiss = () => {
    if (notifications.length === 0) return;
    
    const currentId = notifications[currentIndex].id;
    const newDismissed = new Set(dismissedIds).add(currentId);
    setDismissedIds(newDismissed);
    sessionStorage.setItem("dismissed_notifications", JSON.stringify(Array.from(newDismissed)));

    const remaining = notifications.filter(n => n.id !== currentId);
    setNotifications(remaining);
    
    if (remaining.length === 0) {
      setIsVisible(false);
    } else {
      setCurrentIndex(prev => prev >= remaining.length ? 0 : prev);
    }
  };

  if (!isVisible || notifications.length === 0) return null;

  const currentNotification = notifications[currentIndex];
  const Icon = currentNotification.icon;
  const isWarning = currentNotification.type === "warning";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`w-full relative overflow-hidden z-[110] border-b ${
            isWarning 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-200" 
                : "bg-blue-500/10 border-blue-500/20 text-blue-200"
          }`}
        >
          <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between min-h-[40px]">
            <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                <motion.div
                    key={currentNotification.id}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3 text-xs sm:text-sm font-medium"
                >
                    <Icon className={`w-4 h-4 shrink-0 ${isWarning ? "text-amber-400" : "text-blue-400"}`} />
                    <span className="truncate">{currentNotification.message}</span>
                </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 ml-4 shrink-0">
                {notifications.length > 1 && (
                    <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest hidden sm:block">
                        {currentIndex + 1} OF {notifications.length}
                    </span>
                )}
                <button
                    onClick={handleDismiss}
                    className={`p-1 rounded-lg transition-colors active:scale-95 ${
                        isWarning ? "hover:bg-amber-500/20" : "hover:bg-blue-500/20"
                    }`}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
