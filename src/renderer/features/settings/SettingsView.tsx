/**
 * SettingsView — tab layout + routing only. Each tab's UI, state, and
 * data live in its own component under components/.
 */

import { useEffect, useState } from "react";
import { Bell, Key, Shield, ShieldCheck } from "lucide-react";
import { ApiKeysTab } from "./components/ApiKeysTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { PasswordTab } from "./components/PasswordTab";
import { SecurityTab } from "./components/SecurityTab";
import { useNotificationSettings } from "./hooks/useNotificationSettings";

interface SettingsViewProps {
    initialTab?: string;
}

const tabs = [
    { id: "api-keys", label: "API Keys", icon: Key },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "password", label: "Password", icon: ShieldCheck },
];

export function SettingsView({ initialTab }: SettingsViewProps) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const { error: notificationError } = useNotificationSettings();

    // Sync activeTab when prop changes
    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

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
                {notificationError && (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-3">
                        <Shield className="w-5 h-5" />
                        {notificationError}
                    </div>
                )}

                {activeTab === "api-keys" && <ApiKeysTab />}
                {activeTab === "notifications" && <NotificationsTab />}
                {activeTab === "security" && <SecurityTab />}
                {activeTab === "password" && <PasswordTab />}
            </div>
        </div>
    );
}
