/**
 * NotificationsTab — Telegram notification settings.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Eye, EyeOff, Info, Save, TestTube } from "lucide-react";
import { useNotificationSettings } from "../hooks/useNotificationSettings";

export function NotificationsTab() {
    const {
        settings: notificationSettings,
        save: saveNotifications,
        test: testNotifications,
    } = useNotificationSettings();

    const [showTelegramToken, setShowTelegramToken] = useState(false);
    const [telegramForm, setTelegramForm] = useState({ botToken: "", chatId: "" });
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (notificationSettings) {
            setTelegramForm((prev) => ({
                ...prev,
                chatId: notificationSettings.chatId || "",
            }));
        }
    }, [notificationSettings]);

    return (
        <div className="space-y-6">
            {successMessage && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-3">
                    <Save className="w-5 h-5" />
                    {successMessage}
                </div>
            )}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-container rounded-[32px] overflow-hidden"
            >
                <button
                    onClick={() =>
                        setExpandedProvider(expandedProvider === "telegram" ? null : "telegram")
                    }
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-white/5 transition-all"
                >
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
                            <Bell className="w-7 h-7 text-sky-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                Telegram Notifications
                            </h3>
                            <p className="text-gray-500 text-sm">
                                Login Alerts & Notifications
                            </p>
                        </div>
                    </div>
                </button>

                {expandedProvider === "telegram" && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="px-6 pb-6 space-y-4"
                    >
                        <div className="bg-sky-500/10 rounded-2xl p-4 border border-sky-500/20">
                            <h4 className="text-sky-400 text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Info className="w-3 h-3" />
                                How to set up your Bot
                            </h4>
                            <ol className="space-y-2 text-gray-400 text-sm">
                                <li className="flex gap-2">
                                    <span className="text-sky-500 font-bold">1.</span>
                                    <span>
                                        Create a bot via{" "}
                                        <a
                                            href="https://t.me/botfather"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sky-400 hover:underline selectable"
                                        >
                                            @BotFather
                                        </a>{" "}
                                        to get your <b>Bot Token</b>.
                                    </span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-sky-500 font-bold">2.</span>
                                    <span>
                                        Search for{" "}
                                        <a
                                            href="https://t.me/userinfobot"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sky-400 hover:underline selectable"
                                        >
                                            @userinfobot
                                        </a>{" "}
                                        to find your <b>Chat ID</b>.
                                    </span>
                                </li>
                                <li className="flex gap-2 bg-sky-500/20 p-2 rounded-lg border border-sky-500/30">
                                    <span className="text-sky-500 font-bold">3.</span>
                                    <span className="text-white font-medium">
                                        IMPORTANT: Send <u>/start</u> to your bot before testing!
                                        Bots cannot message you first.
                                    </span>
                                </li>
                            </ol>
                        </div>

                        {/* Bot Token Field */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                                Bot Token{" "}
                                {notificationSettings?.hasToken &&
                                    "(leave blank to keep existing)"}
                            </label>
                            <div className="relative">
                                <input
                                    type={showTelegramToken ? "text" : "password"}
                                    value={telegramForm.botToken}
                                    onChange={(e) =>
                                        setTelegramForm((prev) => ({
                                            ...prev,
                                            botToken: e.target.value,
                                        }))
                                    }
                                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyZ"
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:bg-white/10 focus:border-sky-500/50 focus:outline-none transition-all selectable"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                                >
                                    {showTelegramToken ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Chat ID Field */}
                        <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-2">
                                Chat ID
                            </label>
                            <input
                                type="text"
                                value={telegramForm.chatId}
                                onChange={(e) =>
                                    setTelegramForm((prev) => ({
                                        ...prev,
                                        chatId: e.target.value,
                                    }))
                                }
                                placeholder="123456789"
                                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:bg-white/10 focus:border-sky-500/50 focus:outline-none transition-all selectable"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                onClick={async () => {
                                    const success = await saveNotifications(telegramForm);
                                    if (success) {
                                        setTelegramForm((prev) => ({
                                            ...prev,
                                            botToken: "",
                                        }));
                                        setSuccessMessage("Telegram settings saved!");
                                        setTimeout(() => setSuccessMessage(null), 3000);
                                    }
                                }}
                                disabled={
                                    !telegramForm.chatId ||
                                    (!telegramForm.botToken &&
                                        !notificationSettings?.hasToken)
                                }
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>

                            <button
                                onClick={() => testNotifications(telegramForm)}
                                disabled={
                                    !telegramForm.chatId ||
                                    (!telegramForm.botToken &&
                                        !notificationSettings?.hasToken)
                                }
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                            >
                                <TestTube className="w-4 h-4" />
                                Test Notification
                            </button>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
