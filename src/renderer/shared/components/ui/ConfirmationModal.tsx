import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@core/utils";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isProcessing?: boolean;
    variant?: "danger" | "warning" | "info";
}

export function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isProcessing = false,
    variant = "danger",
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case "danger":
                return {
                    icon: AlertCircle,
                    iconColor: "text-red-400",
                    iconBg: "bg-red-500/10",
                    buttonBg: "bg-red-500 hover:bg-red-600 shadow-red-500/20",
                    itemBorder: "border-red-500/20",
                };
            case "warning":
                return {
                    icon: AlertCircle,
                    iconColor: "text-orange-400",
                    iconBg: "bg-orange-500/10",
                    buttonBg: "bg-orange-500 hover:bg-orange-600 shadow-orange-500/20",
                    itemBorder: "border-orange-500/20",
                };
            default:
                return {
                    icon: AlertCircle,
                    iconColor: "text-primary",
                    iconBg: "bg-primary/10",
                    buttonBg: "bg-primary hover:bg-primary-hover shadow-primary/20",
                    itemBorder: "border-primary/20",
                };
        }
    };

    const styles = getVariantStyles();
    const Icon = styles.icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md glass-container rounded-[32px] p-8 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border", styles.iconBg, styles.itemBorder)}>
                                <Icon className={cn("w-6 h-6", styles.iconColor)} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{title}</h2>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black mt-1">Confirmation Required</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors text-gray-500 hover:text-white disabled:opacity-50"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="mb-8">
                        <p className="text-sm text-gray-400 leading-relaxed">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isProcessing}
                            className="flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isProcessing}
                            className={cn(
                                "flex-[2] py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50",
                                styles.buttonBg
                            )}
                        >
                            {isProcessing ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                confirmLabel
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
