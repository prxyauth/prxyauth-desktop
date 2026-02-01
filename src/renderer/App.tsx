import { useState } from "react";
import { AuthProvider } from "@features/auth/context/AuthContext";
import { SessionProvider } from "@features/sessions/context/SessionContext";
import { useAuth } from "@features/auth/hooks/useAuth";
import { LoginView } from "@features/auth/LoginView";
import { RegisterView } from "@features/auth/RegisterView";
import { MainLayout } from "@shared/components/layout/MainLayout";
import { AnimatePresence, motion } from "framer-motion";
import { useBrowserStatus } from "@features/browser-setup/hooks/useBrowserStatus";
import { BrowserSetupView } from "@features/browser-setup/BrowserSetupView";

function AppContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    status: browserStatus,
    error: browserError,
    retry,
  } = useBrowserStatus();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const isLoading = isAuthLoading || !browserStatus;
  const isBrowserLoading =
    browserStatus &&
    (!browserStatus.isInstalled || browserStatus.isDownloading);

  if (isBrowserLoading) {
    return (
      <BrowserSetupView
        progress={browserStatus?.progress?.percent || 0}
        message={browserStatus?.progress?.message}
        error={browserError}
        onRetry={retry}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="relative">
          <div className="absolute -inset-8 bg-primary/20 blur-3xl rounded-full animate-pulse" />
          <div className="w-16 h-16 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        authMode === "login" ? (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <LoginView
              onLoginSuccess={() => {}}
              onSwitchToRegister={() => setAuthMode("register")}
            />
          </motion.div>
        ) : (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <RegisterView
              onRegisterSuccess={() => {}}
              onSwitchToLogin={() => setAuthMode("login")}
            />
          </motion.div>
        )
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-screen"
        >
          <MainLayout />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <div className="relative min-h-screen bg-[#050505] selection:bg-primary/30 selection:text-white">
          <div className="mesh-gradient" />
          <AppContent />
        </div>
      </SessionProvider>
    </AuthProvider>
  );
}
