/**
 * ApiKeysTab — list/generate/revoke API keys.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
    Calendar,
    ChevronRight,
    Clock,
    Copy,
    ExternalLink,
    Key,
    Plus,
    Shield,
    ShieldCheck,
    Trash2,
    XCircle,
} from "lucide-react";
import { useApiKeys } from "../hooks/useApiKeys";

export function ApiKeysTab() {
    const {
        keys,
        isLoading: isKeysLoading,
        error: keysError,
        generate: generateKey,
        revoke: revokeKey,
    } = useApiKeys();

    const [newKeyData, setNewKeyData] = useState<{
        key: string;
        prefix: string;
        id: string;
    } | null>(null);
    const [keyName, setKeyName] = useState("");
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-container rounded-[32px] p-8"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Key className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">API Keys</h3>
                            <p className="text-gray-500 text-sm">
                                Manage authentication for automated tools
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative group flex-1 min-w-[200px]">
                            <input
                                type="text"
                                value={keyName}
                                onChange={(e) => setKeyName(e.target.value)}
                                placeholder="Key Name (e.g. CI/CD)"
                                className="w-full pl-4 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                            />
                            <button
                                onClick={async () => {
                                    if (!keyName) return;
                                    const result = await generateKey({ name: keyName });
                                    if (result) {
                                        setNewKeyData(result);
                                        setKeyName("");
                                    }
                                }}
                                disabled={isKeysLoading || !keyName}
                                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {keysError && (
                    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold flex items-center gap-3">
                        <XCircle className="w-4 h-4" />
                        {keysError}
                    </div>
                )}

                {newKeyData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-8 p-6 rounded-3xl bg-primary/10 border border-primary/20 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-2">
                            <button
                                onClick={() => setNewKeyData(null)}
                                className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-1">
                                    Key Generated Successfully
                                </h4>
                                <p className="text-xs text-primary/80 leading-relaxed">
                                    Copy this key now. For your security, it won't be shown again.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-4 rounded-xl bg-black/40 border border-white/5">
                            <code className="flex-1 text-primary font-mono text-sm break-all">
                                {newKeyData.key}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(newKeyData.key);
                                    setSuccessMessage("API Key copied to clipboard!");
                                    setTimeout(() => setSuccessMessage(null), 3000);
                                }}
                                className="p-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all shrink-0"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                )}

                <div className="space-y-3">
                    {isKeysLoading && keys.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-600 gap-4">
                            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                            <span className="text-xs font-bold uppercase tracking-widest">
                                Fetching keys...
                            </span>
                        </div>
                    ) : keys.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mb-4">
                                <Key className="w-8 h-8 text-gray-700" />
                            </div>
                            <h4 className="text-white font-bold mb-1">No API Keys Yet</h4>
                            <p className="text-gray-500 text-xs max-w-[240px]">
                                Create your first API key above to start automating with PRXY PRO.
                            </p>
                        </div>
                    ) : (
                        keys.map((key) => (
                            <div
                                key={key.id}
                                className="group flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                                        <Shield className="w-5 h-5 text-gray-500 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-sm font-bold text-white">
                                                {key.name}
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-gray-500 tracking-wider">
                                                {key.prefix}••••
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                <Calendar className="w-3 h-3" />
                                                Created {new Date(key.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {key.lastUsedAt
                                                    ? `Used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                                                    : "Never used"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                "Are you sure you want to revoke this API key?",
                                            )
                                        ) {
                                            revokeKey(key.id);
                                        }
                                    }}
                                    className="p-2.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    title="Revoke Key"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>

            {successMessage && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-3">
                    <Copy className="w-5 h-5" />
                    {successMessage}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-container rounded-[2.5rem] p-6 border-blue-500/10"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <ExternalLink className="w-5 h-5 text-blue-400" />
                        </div>
                        <h4 className="text-sm font-bold text-white">Documentation</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                        Learn how to use PRXY PRO API keys with your custom scripts and
                        server-side applications.
                    </p>
                    <button className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 group">
                        View Docs{" "}
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-container rounded-[2.5rem] p-6 border-emerald-500/10"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h4 className="text-sm font-bold text-white">
                            Security Best Practices
                        </h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                        Never share your API keys or commit them to public repositories. Use
                        environment variables.
                    </p>
                    <button className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 group">
                        Security Guide{" "}
                        <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
