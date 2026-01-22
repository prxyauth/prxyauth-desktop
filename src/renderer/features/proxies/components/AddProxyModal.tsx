import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Server, Lock, User, Check, AlertCircle, Zap } from "lucide-react";
import { ProxyConfig } from "@core/types";
import { cn } from "@core/utils";

interface AddProxyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (proxy: ProxyConfig, validate: boolean) => Promise<boolean>;
    onValidate: (proxy: ProxyConfig) => Promise<{ success: boolean; ip?: string; latency?: number; message?: string }>;
    isAdding: boolean;
    isValidating: boolean;
}

export function AddProxyModal({
    isOpen,
    onClose,
    onAdd,
    onValidate,
    isAdding,
    isValidating,
}: AddProxyModalProps) {
    const [server, setServer] = useState("");
    const [protocol, setProtocol] = useState<"http" | "socks5">("http");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [shouldValidate, setShouldValidate] = useState(true);
    const [validationResult, setValidationResult] = useState<{ success: boolean; ip?: string; latency?: number; message?: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalServer = server.trim();
        // If server doesn't have a protocol, prepend the selected one
        if (!/^[a-z0-9]+:\/\//i.test(finalServer)) {
            finalServer = `${protocol}://${finalServer}`;
        }

        const success = await onAdd({ server: finalServer, username, password }, shouldValidate);
        if (success) {
            handleClose();
        }
    };

    const handleValidate = async () => {
        if (!server) return;
        setValidationResult(null);

        let finalServer = server.trim();
        if (!/^[a-z0-9]+:\/\//i.test(finalServer)) {
            finalServer = `${protocol}://${finalServer}`;
        }

        const result = await onValidate({ server: finalServer, username, password });
        setValidationResult(result);
    };

    const handleClose = () => {
        setServer("");
        setProtocol("http");
        setUsername("");
        setPassword("");
        setValidationResult(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg glass-container rounded-[32px] p-8 shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Server className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Add New Proxy</h2>
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-black mt-1">Pool Management</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-xl hover:bg-white/5 flex items-center justify-center transition-colors text-gray-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Protocol Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Protocol</label>
                            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setProtocol("http")}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                        protocol === "http"
                                            ? "bg-primary text-white shadow-lg"
                                            : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    HTTP / HTTPS
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setProtocol("socks5")}
                                    className={cn(
                                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                        protocol === "socks5"
                                            ? "bg-primary text-white shadow-lg"
                                            : "text-gray-500 hover:text-white"
                                    )}
                                >
                                    SOCKS5
                                </button>
                            </div>
                        </div>

                        {/* Server Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Proxy Server</label>
                            <div className="relative">
                                <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input
                                    required
                                    type="text"
                                    placeholder="proxy.example.com:8080"
                                    value={server}
                                    onChange={(e) => setServer(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-700 font-mono"
                                />
                            </div>
                        </div>

                        {/* Credentials Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Username (Optional)</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="text"
                                        placeholder="user123"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-700"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Password (Optional)</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-gray-700"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Validation Section */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="validate-check"
                                    checked={shouldValidate}
                                    onChange={(e) => setShouldValidate(e.target.checked)}
                                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-primary focus:ring-primary"
                                />
                                <label htmlFor="validate-check" className="text-xs font-bold text-gray-400">Validate before adding</label>
                            </div>
                            <button
                                type="button"
                                onClick={handleValidate}
                                disabled={!server || isValidating}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-primary hover:text-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isValidating ? (
                                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : <Zap className="w-3 h-3" />}
                                Check Proxy
                            </button>
                        </div>

                        {/* Validation feedback */}
                        {validationResult && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "p-4 rounded-[20px] border flex items-start gap-3",
                                    validationResult.success
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                )}
                            >
                                {validationResult.success ? <Check className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                                <div className="text-xs space-y-1">
                                    <p className="font-bold">{validationResult.message}</p>
                                    {validationResult.success && (
                                        <p className="opacity-70">
                                            External IP: <span className="font-mono">{validationResult.ip}</span> • Latency: {validationResult.latency}ms
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-4 pt-2">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all bg-white/5 border border-white/5 hover:bg-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isAdding || !server}
                                className="flex-[2] py-4 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all bg-primary hover:bg-primary-hover shadow-lg flex items-center justify-center gap-2"
                            >
                                {isAdding ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Adding to Pool...
                                    </>
                                ) : (
                                    <>
                                        Add to Rotation Pool
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
