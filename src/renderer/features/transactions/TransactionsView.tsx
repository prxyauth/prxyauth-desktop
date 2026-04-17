/**
 * TransactionsView - Payment history for the desktop app
 * Ported from fe-prxyauth/billing/transactions, using desktop design system
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import { billingApi } from "@core/api/client";
import { Transaction } from "@core/types";
import { cn } from "@core/utils";

export function TransactionsView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    const fetchTransactions = async (showLoading = true) => {
      try {
        if (showLoading) setIsLoading(true);
        const data = await billingApi.listTransactions();
        setTransactions(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load transactions",
        );
      } finally {
        if (showLoading) setIsLoading(false);
      }
    };

    fetchTransactions();

    // Poll every 15 seconds to sync state changes (like PENDING -> EXPIRED)
    interval = setInterval(() => {
      fetchTransactions(false);
    }, 15000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const getStatusConfig = (status: Transaction["status"]) => {
    switch (status) {
      case "PAID":
        return {
          icon: <CheckCircle2 className="w-4 h-4" />,
          classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
          label: "Confirmed",
        };
      case "PENDING":
        return {
          icon: <Clock className="w-4 h-4" />,
          classes: "bg-primary/10 text-primary border-primary/20",
          label: "Pending",
        };
      case "FAILED":
        return {
          icon: <XCircle className="w-4 h-4" />,
          classes: "bg-red-500/10 text-red-400 border-red-500/20",
          label: "Failed",
        };
      case "EXPIRED":
        return {
          icon: <AlertCircle className="w-4 h-4" />,
          classes: "bg-gray-500/10 text-gray-400 border-gray-500/20",
          label: "Expired",
        };
      default:
        return {
          icon: <Clock className="w-4 h-4" />,
          classes: "bg-gray-500/10 text-gray-400 border-gray-500/20",
          label: status,
        };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-1 sm:p-2 lg:p-4">
      {/* Header */}
      <div className="sticky top-0 z-[60] -mx-4 px-4 py-6 mb-6 bg-black/40 backdrop-blur-3xl border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6 transition-all duration-300">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase leading-none">
            Transaction <span className="text-primary italic">History</span>
          </h1>
          <p className="text-gray-500 uppercase tracking-[0.25em] font-black text-[9px] mt-3 flex items-center gap-2">
            <ArrowLeftRight className="w-3 h-3 text-primary" />
            Payment Ledger
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="glass-container rounded-[32px] overflow-hidden border border-white/5">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="text-sm font-bold uppercase tracking-widest">
              Loading Transactions...
            </p>
          </div>
        ) : error ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-white font-bold mb-2">Failed to load</h3>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 mb-4">
              <Receipt className="w-8 h-8" />
            </div>
            <h3 className="text-white font-bold mb-2">No Transactions</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              You haven't made any purchases yet. Head to the marketplace to
              get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                    Date
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                    Provider
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                    Amount
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">
                    Status
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-right whitespace-nowrap">
                    ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx, idx) => {
                  const statusConfig = getStatusConfig(tx.status);
                  return (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-6 whitespace-nowrap">
                        <div className="font-mono text-xs text-gray-400">
                          {formatDate(tx.createdAt)}
                        </div>
                      </td>
                      <td className="p-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white uppercase tracking-wider">
                            {tx.provider}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase">
                            {tx.durationMonths} MO
                          </span>
                        </div>
                      </td>
                      <td className="p-6 whitespace-nowrap">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-black text-white tabular-nums tracking-tighter">
                            {tx.amount}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase">
                            {tx.currency}
                          </span>
                        </div>
                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                          via {tx.paymentMethod}
                        </div>
                      </td>
                      <td className="p-6 whitespace-nowrap">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest",
                            statusConfig.classes,
                          )}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </div>
                      </td>
                      <td className="p-6 text-right whitespace-nowrap">
                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest font-mono selectable">
                          {tx.id.split("-")[0]}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
