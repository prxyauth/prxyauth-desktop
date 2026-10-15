/**
 * PasswordTab — change password + forced re-login.
 *
 * ONE submit path (submit()) used by both Enter key and the button;
 * the pre-migration copy had two identical inline handlers.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Clock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { authApi } from "@core/api/client";
import { useAuth } from "@features/auth/context/AuthContext";

export function PasswordTab() {
    const { logout } = useAuth();

    const [pwCurrent, setPwCurrent] = useState("");
    const [pwNew, setPwNew] = useState("");
    const [pwConfirm, setPwConfirm] = useState("");
    const [pwShowCurrent, setPwShowCurrent] = useState(false);
    const [pwShowNew, setPwShowNew] = useState(false);
    const [pwShowConfirm, setPwShowConfirm] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwSuccess, setPwSuccess] = useState<string | null>(null);

    /** Single validation + submit path for Enter and button. */
    const submit = async () => {
        setPwError(null);
        setPwSuccess(null);
        if (!pwCurrent || !pwNew || !pwConfirm) {
            setPwError("All fields are required");
            return;
        }
        if (pwNew !== pwConfirm) {
            setPwError("New passwords do not match");
            return;
        }
        if (pwNew.length < 8) {
            setPwError("New password must be at least 8 characters");
            return;
        }
        setPwLoading(true);
        try {
            const res = await authApi.changePassword({
                currentPassword: pwCurrent,
                newPassword: pwNew,
            });
            if (res.success) {
                setPwSuccess("Password changed successfully. Please log in again.");
                setPwCurrent("");
                setPwNew("");
                setPwConfirm("");
                setTimeout(() => {
                    // Storage keys are owned by AuthContext — logout() clears
                    // the real keys (prx_token) and the whole query cache.
                    logout();
                    window.location.reload();
                }, 2000);
            } else {
                setPwError(res.message || "Failed to change password");
            }
        } catch (err: any) {
            setPwError(err.message || "An unexpected error occurred");
        } finally {
            setPwLoading(false);
        }
    };

    const inputClass =
        "w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:bg-white/10 focus:border-sky-500/50 focus:outline-none transition-all selectable";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-container rounded-[32px] overflow-hidden p-8"
        >
            <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                    <ShieldCheck className="w-7 h-7 text-sky-400" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">Change Password</h3>
                    <p className="text-gray-500 text-sm">
                        Enter your current password and choose a new one
                    </p>
                </div>
            </div>

            <div className="space-y-5 max-w-md">
                {/* Current Password */}
                <div>
                    <label className="text-gray-400 text-sm font-medium mb-2 block">
                        Current Password
                    </label>
                    <div className="relative">
                        <input
                            type={pwShowCurrent ? "text" : "password"}
                            value={pwCurrent}
                            onChange={(e) => setPwCurrent(e.target.value)}
                            className={inputClass}
                            placeholder="Enter current password"
                        />
                        <button
                            onClick={() => setPwShowCurrent(!pwShowCurrent)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                            {pwShowCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* New Password */}
                <div>
                    <label className="text-gray-400 text-sm font-medium mb-2 block">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={pwShowNew ? "text" : "password"}
                            value={pwNew}
                            onChange={(e) => setPwNew(e.target.value)}
                            className={inputClass}
                            placeholder="At least 8 characters"
                        />
                        <button
                            onClick={() => setPwShowNew(!pwShowNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                            {pwShowNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                {/* Confirm New Password */}
                <div>
                    <label className="text-gray-400 text-sm font-medium mb-2 block">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            type={pwShowConfirm ? "text" : "password"}
                            value={pwConfirm}
                            onChange={(e) => setPwConfirm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !pwLoading) void submit();
                            }}
                            className={inputClass}
                            placeholder="Re-enter new password"
                        />
                        <button
                            onClick={() => setPwShowConfirm(!pwShowConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                            {pwShowConfirm ? (
                                <EyeOff className="w-5 h-5" />
                            ) : (
                                <Eye className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Error */}
                {pwError && (
                    <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {pwError}
                    </div>
                )}

                {/* Success */}
                {pwSuccess && (
                    <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {pwSuccess}
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={() => void submit()}
                    disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                    className="px-6 py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {pwLoading && <Clock className="w-4 h-4 animate-spin" />}
                    {pwLoading ? "Changing..." : "Change Password"}
                </button>
            </div>
        </motion.div>
    );
}
