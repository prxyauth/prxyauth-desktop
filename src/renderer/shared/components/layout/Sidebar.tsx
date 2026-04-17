import { cn } from "@core/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutDashboard,
  Server,
  Settings,
  ShieldCheck,
  ShoppingBag
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { label: "Profiles", id: "sessions", icon: LayoutDashboard },
  { label: "Marketplace", id: "marketplace", icon: ShoppingBag },
  { label: "Transactions", id: "transactions", icon: ArrowLeftRight },
  { label: "Proxy Manager", id: "proxies", icon: Server },
  { label: "Proxy Providers", id: "proxy-providers", icon: Layers },
  { label: "Settings", id: "settings", icon: Settings },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed: initialCollapsed = false,
  onToggleCollapse,
  isOpen,
  onClose,
}: SidebarProps) {
  const [localCollapsed, setLocalCollapsed] = useState(initialCollapsed);
  const isCollapsed = onToggleCollapse ? initialCollapsed : localCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed(!localCollapsed);
    }
  };

  const sidebarVariants = {
    expanded: { width: 240 },
    collapsed: { width: 72 },
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[95]"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Desktop & Mobile */}
      <motion.aside
        initial={false}
        animate={isOpen ? "expanded" : isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        className={cn(
          "fixed top-0 left-0 h-screen z-[100] bg-black/20 backdrop-blur-3xl border-r border-white/5 overflow-hidden flex flex-col transition-all duration-300 shadow-2xl lg:shadow-none drag-region",
          "max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:h-full",
          isOpen ? "translate-x-0" : "max-lg:-translate-x-full",
        )}
      >
        {/* Logo Section */}
        <div className="h-14 lg:h-16 flex items-center px-6 border-b border-white/5 no-drag select-none cursor-default">
          <div
            className="flex items-center gap-3 group"
            onClick={() => onTabChange("sessions")}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isCollapsed && !isOpen ? "w-0 opacity-0" : "w-32 opacity-100",
              )}
            >
              <h1 className="text-sm font-black text-white tracking-widest leading-none mb-0.5">
                PRXY
              </h1>
              <p className="text-[7px] uppercase tracking-[0.4em] font-black text-primary/60">
                ENTERPRISE
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1 no-drag">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group overflow-hidden",
                  isActive
                    ? "bg-white/5 text-primary border border-white/5"
                    : "text-gray-500 hover:text-white hover:bg-white/5 border border-transparent",
                )}
              >
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-transform duration-300",
                    isActive ? "text-primary" : "group-hover:scale-105",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 whitespace-nowrap text-left",
                    isCollapsed && !isOpen
                      ? "w-0 opacity-0"
                      : "w-auto opacity-100",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle - Desktop only */}
        <div className="p-2 border-t border-white/5 hidden lg:block no-drag">
          <button
            onClick={handleToggle}
            className="w-full flex items-center justify-center p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Footer Branding */}
        <div className="p-4 border-t border-white/5 no-drag select-none cursor-default">
          <div className="flex items-center gap-2 opacity-30">
            <Layers className="w-4 h-4 shrink-0 text-gray-500" />
            <span
              className={cn(
                "text-[8px] font-black uppercase tracking-[0.4em] text-gray-500 transition-all duration-300",
                isCollapsed && !isOpen ? "w-0 opacity-0" : "w-auto opacity-100",
              )}
            >
              v2.0 PRO
            </span>
          </div>
        </div>
      </motion.aside>

      {/* Spacer for content - Fixed width on desktop */}
      <div
        className={cn(
          "hidden lg:block transition-all duration-300 select-none pointer-events-none",
          isCollapsed ? "w-[72px]" : "w-[240px]",
        )}
      />
    </>
  );
}
