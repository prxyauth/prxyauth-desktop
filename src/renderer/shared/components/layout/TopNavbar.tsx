import {
    User,
    LogOut,
    Search,
    RefreshCw,
    Settings,
    Menu,
} from "lucide-react";
import { cn } from "@core/utils";
import { useAuth } from "@features/auth/hooks/useAuth";
import { useSessions } from "@features/sessions/hooks/useSessions";

interface TopNavbarProps {
    onToggleSidebar?: () => void;
    onTabChange: (tab: any) => void;
    activeTab?: string;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
}

export function TopNavbar({ onToggleSidebar, onTabChange, activeTab, searchQuery, onSearchChange }: TopNavbarProps) {
    const { user, logout: authLogout } = useAuth();
    const { refresh, isLoading } = useSessions();

    const isSessionPage = activeTab === "sessions" || activeTab === "session-detail";

    return (
        <header className="h-14 lg:h-16 px-4 sm:px-6 border-b border-white/5 bg-black/40 backdrop-blur-3xl sticky top-0 z-[100] flex items-center justify-between drag-region select-none">
            <div className="flex items-center gap-4 lg:gap-6 flex-1 no-drag">
                {/* Mobile Toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all active:scale-95"
                >
                    <Menu className="w-6 h-6" />
                </button>

                {/* Contextual Search - Only on sessions page */}
                {isSessionPage && (
                    <div className="relative group hidden lg:block w-full max-w-sm no-drag">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchQuery || ""}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all hover:bg-white/[0.07]"
                        />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-2.5 no-drag">
                {/* Refresh - Only on sessions page */}
                {isSessionPage && (
                    <button
                        onClick={refresh}
                        className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-transparent active:scale-95"
                        title="Refresh Monitor"
                    >
                        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                )}

                {/* Vertical Divider - Hidden on mobile */}
                <div className="hidden sm:block w-px h-8 bg-white/10 mx-1 sm:mx-2" />

                {/* User Profile */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {user && (
                        <div className="hidden xl:flex flex-col items-end">
                            <span className="text-[11px] font-black text-white leading-none">
                                {user.email.split('@')[0]}
                            </span>
                            <span className="text-[9px] font-black text-primary/60 uppercase tracking-widest mt-1">
                                Pro Member
                            </span>
                        </div>
                    )}

                    <div className="relative group">
                        <button className="w-9 h-9 sm:w-11 h-11 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all group-hover:border-primary/40 overflow-hidden">
                            <User className="w-4 h-4 sm:w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                        </button>

                        {/* Simple Dropdown on hover */}
                        <div className="absolute right-0 top-full pt-2 w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-[110]">
                            <div className="glass-container rounded-2xl p-2 border border-white/10 shadow-2xl">
                                <div className="px-4 py-3 border-b border-white/5 xl:hidden">
                                    <p className="text-[9px] text-gray-500 font-black uppercase mb-1 whitespace-nowrap">Signed in as</p>
                                    <p className="text-[10px] text-white font-bold truncate">{user?.email}</p>
                                </div>

                                <button
                                    onClick={() => onTabChange("settings")}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all text-left"
                                >
                                    <Settings className="w-4 h-4" />
                                    Profile Settings
                                </button>

                                <button
                                    onClick={authLogout}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-all text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
