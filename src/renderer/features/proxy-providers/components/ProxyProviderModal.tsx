import { useState, useEffect } from "react";
import { X, Shield, Key, User, Globe, Hash, Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProxyProviderConfig, ProxyProviderType, SaveProviderRequest } from "@core/types";
import { cn } from "@core/utils";

interface ProxyProviderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: SaveProviderRequest) => Promise<boolean>;
    provider?: ProxyProviderConfig | null;
    isSaving: boolean;
}

const PROVIDER_OPTIONS: { value: ProxyProviderType; label: string }[] = [
    { value: "OXYLABS", label: "Oxylabs" },
    { value: "BRIGHTDATA", label: "Bright Data" },
    { value: "FLOPPYDATA", label: "Floppy Data" },
];

export function ProxyProviderModal({
    isOpen,
    onClose,
    onSave,
    provider,
    isSaving
}: ProxyProviderModalProps) {
    const [selectedType, setSelectedType] = useState<ProxyProviderType>("OXYLABS");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [customerId, setCustomerId] = useState("");
    const [zone, setZone] = useState("");
    const [priority, setPriority] = useState(1);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (provider) {
            setSelectedType(provider.provider);
            setUsername(provider.username || "");
            setPassword(""); // Never pre-fill password
            setCustomerId(provider.customerId || "");
            setZone(provider.zone || "");
            setPriority(provider.priority || 1);
        } else {
            setSelectedType("OXYLABS");
            setUsername("");
            setPassword("");
            setCustomerId("");
            setZone("");
            setPriority(1);
        }
        setError(null);
    }, [provider, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!password && !provider) {
            setError("Password is required for new configurations");
            return;
        }

        const success = await onSave({
            provider: selectedType,
            username: username || undefined,
            password,
            customerId: customerId || undefined,
            zone: zone || undefined,
            priority,
        });

        if (success) {
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-lg bg-[#0A0A0B] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="bg-white/5 p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight">
                                        {provider ? "Edit Provider" : "Add Provider"}
                                    </h2>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                                        Secure Proxy Route Configuration
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all no-drag"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Provider Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">
                                    Target Provider
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {PROVIDER_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setSelectedType(opt.value)}
                                            disabled={!!provider}
                                            className={cn(
                                                "py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                                selectedType === opt.value
                                                    ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(129,140,248,0.2)]"
                                                    : "bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10",
                                                !!provider && selectedType !== opt.value && "opacity-30 grayscale"
                                            )}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Username */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">
                                        Username / Key
                                    </label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-primary transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            placeholder="api-user-123"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">
                                        Password / Secret
                                    </label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-primary transition-colors">
                                            <Key className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            placeholder={provider ? "Leave blank to keep current" : "••••••••"}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Customer ID (Oxylabs specific mostly) */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">
                                        Customer ID (Optional)
                                    </label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-primary transition-colors">
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={customerId}
                                            onChange={(e) => setCustomerId(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            placeholder="cust_123"
                                        />
                                    </div>
                                </div>

                                {/* Zone */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">
                                        Zone (Optional)
                                    </label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within/input:text-primary transition-colors">
                                            <Hash className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={zone}
                                            onChange={(e) => setZone(e.target.value)}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold text-white placeholder:text-gray-700 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
                                            placeholder="residential_zone"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Priority */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                                        Routing Priority
                                    </label>
                                    <span className="text-sm font-black text-primary">{priority}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={priority}
                                    onChange={(e) => setPriority(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-600 px-1">
                                    <span>High Priority (1)</span>
                                    <span>Low Priority (10)</span>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold flex items-center gap-3 uppercase tracking-widest"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </motion.div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/5 text-gray-500 text-[10px] font-black uppercase tracking-[0.25em] transition-all hover:bg-white/10 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] py-4 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-[0.25em] transition-all shadow-[0_15px_30px_rgba(129,140,248,0.3)] hover:shadow-[0_20px_40px_rgba(129,140,248,0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Encrypting...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Configuration
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
