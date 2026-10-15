/**
 * SecurityTab — static security posture info.
 */
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export function SecurityTab() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-container rounded-[32px] overflow-hidden p-8"
        >
            <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Shield className="w-7 h-7 text-primary" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Security & Encryption</h3>
                    <p className="text-gray-500 text-sm">How your data is protected</p>
                </div>
            </div>
            <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-gray-400 text-sm">
                        All credentials are encrypted using AES-256-GCM.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
