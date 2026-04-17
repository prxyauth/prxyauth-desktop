/**
 * SettingsView - Proxy Provider and Notification Configuration
 */

import { motion } from "framer-motion";
import {
  Bell,
  CheckCircle,
  Key,
  Shield,
  Trash2,
  XCircle,
  Copy,
  ExternalLink,
  Calendar,
  Plus,
  Clock,
  ShieldCheck,
  ChevronRight,
  Eye,
  EyeOff,
  Info,
  Save,
  TestTube,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useApiKeys } from "./hooks/useApiKeys";
import { useNotificationSettings } from "./hooks/useNotificationSettings";

interface SettingsViewProps {
  initialTab?: string;
}

export function SettingsView({ initialTab }: SettingsViewProps) {
  const {
    settings: notificationSettings,
    error: notificationError,
    save: saveNotifications,
    test: testNotifications,
  } = useNotificationSettings();

  // Form states

  // UI states
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [telegramForm, setTelegramForm] = useState({
    botToken: "",
    chatId: "",
  });
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);

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

  const tabs = [
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
  ];

  // Sync activeTab when prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (notificationSettings) {
      setTelegramForm((prev) => ({
        ...prev,
        chatId: notificationSettings.chatId || "",
      }));
    }
  }, [notificationSettings]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start p-1">
      {/* Sidebar Navigation */}
      <div className="w-full lg:w-72 space-y-2 lg:sticky lg:top-8">
        <div className="mb-6 px-2">
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
            Settings
          </h1>
          <p className="text-gray-500 uppercase tracking-[0.2em] font-black text-[10px] mt-1">
            Configuration & Security
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all border ${
                  activeTab === tab.id
                    ? "bg-white/10 border-white/10 text-white shadow-xl shadow-black/20"
                    : "bg-transparent border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    activeTab === tab.id
                      ? "bg-primary/20 text-primary"
                      : "bg-white/5"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-bold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full space-y-8">
        {/* Status Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}

        {notificationError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-3">
            <XCircle className="w-5 h-5" />
            {notificationError}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-container rounded-[32px] overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedProvider(
                    expandedProvider === "telegram" ? null : "telegram",
                  )
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
                        (!telegramForm.botToken && !notificationSettings?.hasToken)
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
                        (!telegramForm.botToken && !notificationSettings?.hasToken)
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
        )}

        {/* API Keys Tab */}
        {activeTab === "api-keys" && (
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
                        Copy this key now. For your security, it won't be shown
                        again.
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
                    <h4 className="text-white font-bold mb-1">
                      No API Keys Yet
                    </h4>
                    <p className="text-gray-500 text-xs max-w-[240px]">
                      Create your first API key above to start automating with
                      PRXY PRO.
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
                              Created{" "}
                              {new Date(key.createdAt).toLocaleDateString()}
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
                  <h4 className="text-sm font-bold text-white">
                    Documentation
                  </h4>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Learn how to use PRXY PRO API keys with your custom scripts
                  and server-side applications.
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
                  Never share your API keys or commit them to public
                  repositories. Use environment variables.
                </p>
                <button className="text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-2 group">
                  Security Guide{" "}
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
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
                <h3 className="text-xl font-bold text-white">
                  Security & Encryption
                </h3>
                <p className="text-gray-500 text-sm">
                  How your data is protected
                </p>
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
        )}
      </div>
    </div>
  );
}
