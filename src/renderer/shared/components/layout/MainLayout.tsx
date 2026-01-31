/**
 * MainLayout - Application Shell
 */

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { DashboardView } from "@features/sessions/DashboardView";
import { SessionDetailPage } from "@features/sessions/components/SessionDetailPage";
import { ProxiesView } from "@features/proxies/ProxiesView";
import { ProxyProvidersView } from "@features/proxy-providers/ProxyProvidersView";
import { SettingsView } from "@features/settings/SettingsView";
import { MarketplaceView } from "@features/marketplace/MarketplaceView";
import { TronPaymentPage } from "@features/marketplace/TronPaymentPage";

export function MainLayout() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [selectedTransactionId, setSelectedTransactionId] = useState<
    string | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  const handleNavigateToSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveTab("session-detail");
  };

  const handleNavigateToPayment = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    setActiveTab("payment");
  };

  const handleBackToDashboard = () => {
    setSelectedSessionId(null);
    handleTabChange("sessions");
  };

  const renderView = () => {
    switch (activeTab) {
      case "sessions":
        return (
          <DashboardView
            onNavigateToSession={handleNavigateToSession}
            searchQuery={searchQuery}
          />
        );
      case "session-detail":
        return selectedSessionId ? (
          <SessionDetailPage
            sessionId={selectedSessionId}
            onBack={handleBackToDashboard}
          />
        ) : (
          <DashboardView
            onNavigateToSession={handleNavigateToSession}
            searchQuery={searchQuery}
          />
        );
      case "proxies":
        return <ProxiesView />;
      case "proxy-providers":
        return <ProxyProvidersView />;
      case "settings":
        return <SettingsView initialTab="api-keys" />;
      case "marketplace":
        return (
          <MarketplaceView onNavigateToPayment={handleNavigateToPayment} />
        );
      case "payment":
        return selectedTransactionId ? (
          <TronPaymentPage
            transactionId={selectedTransactionId}
            onBack={() => setActiveTab("marketplace")}
            onSuccess={() => {
              setSelectedTransactionId(null);
              setActiveTab("marketplace");
            }}
          />
        ) : (
          <MarketplaceView onNavigateToPayment={handleNavigateToPayment} />
        );
      default:
        return (
          <DashboardView
            onNavigateToSession={handleNavigateToSession}
            searchQuery={searchQuery}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-[#020204] overflow-hidden font-sans text-slate-200 select-none">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isCollapsed={!isSidebarOpen}
        onToggleCollapse={() => setIsSidebarOpen(!isSidebarOpen)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#050505]">
        <TopNavbar
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onTabChange={handleTabChange}
          activeTab={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {renderView()}
          </div>
        </main>
      </div>
    </div>
  );
}
