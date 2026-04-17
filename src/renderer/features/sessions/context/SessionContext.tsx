import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Session } from "@core/types";
import { sessionApi, ApiError } from "@core/api/client";
import { useAuth } from "@features/auth/hooks/useAuth";

interface SessionContextType {
  sessions: Session[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  logout: (sessionId: string) => Promise<boolean>;
  deleteMultiple: (sessionIds: string[]) => Promise<boolean>;
  loggingOutId: string | null;
  verify: (sessionId: string) => Promise<boolean>;
  verifyingId: string | null;
  open: (sessionId: string) => Promise<boolean>;
  isOpening: string | null;
  isClosing: string | null;
  transitioningSessions: Record<string, { status: string; logs: string[] }>;
  openBrowsers: string[];
  launchSessionBrowser: (sessionId: string) => Promise<void>;
  closeSessionBrowser: (sessionId: string) => Promise<void>;
  showSessionPortal: (sessionId: string) => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOutId, setLoggingOutId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState<string | null>(null);
  const [transitioningSessions, setTransitioningSessions] = useState<
    Record<string, { status: string; logs: string[] }>
  >({});
  const [openBrowsers, setOpenBrowsers] = useState<string[]>([]);

  const setSessionLog = useCallback(
    (sessionId: string, status: string | null, logEntry?: string) => {
      setTransitioningSessions((prev) => {
        const next = { ...prev };
        if (status === null) {
          delete next[sessionId];
        } else {
          const current = next[sessionId] || { status: "", logs: [] };
          next[sessionId] = {
            status: status || current.status,
            logs: logEntry ? [...current.logs, logEntry] : current.logs,
          };
        }
        return next;
      });
    },
    [],
  );

  const fetchSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await sessionApi.list();
      setSessions(data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to fetch sessions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setLoggingOutId(sessionId);
      await sessionApi.logout(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to logout";
      setError(message);
      return false;
    } finally {
      setLoggingOutId(null);
    }
  }, []);

  const deleteMultiple = useCallback(async (sessionIds: string[]): Promise<boolean> => {
    try {
      setIsLoading(true);
      await sessionApi.deleteMultiple(sessionIds);
      setSessions((prev) => prev.filter((s) => !sessionIds.includes(s.id)));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to delete sessions";
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setVerifyingId(sessionId);
      const result = await sessionApi.verify(sessionId);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, status: result.status as any } : s,
        ),
      );
      return result.success;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to verify session";
      setError(message);
      return false;
    } finally {
      setVerifyingId(null);
    }
  }, []);

  const open = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      setIsOpening(sessionId);
      const result = await sessionApi.open(sessionId);
      return result.success;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to open session";
      setError(message);
      return false;
    } finally {
      setIsOpening(null);
    }
  }, []);

  const launchSessionBrowser = useCallback(
    async (sessionId: string) => {
      // Optimistic UI update
      setOpenBrowsers((prev) => [...new Set([...prev, sessionId])]);
      setSessionLog(sessionId, "Initializing...");

      try {
        setIsOpening(sessionId);
        setError(null);

        setSessionLog(
          sessionId,
          "Authentication Check",
          "Retrieving credentials from vault...",
        );
        const session = await sessionApi.get(sessionId);
        if (!session) throw new Error("Session not found");

        setSessionLog(
          sessionId,
          "Data Sync",
          "Exporting browser storage state...",
        );
        const storageState = await sessionApi.exportBrowserState(sessionId);

        setSessionLog(
          sessionId,
          "Launching Chromium",
          "Applying anti-detection fingerprints...",
        );
        const result = await (window as any).prxApi.playwright.launchLocal(
          sessionId,
          storageState,
          session.proxy,
          session.fingerprint,
          { email: session.email },
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to launch local browser");
        }

        setSessionLog(
          sessionId,
          "Connection Ready",
          "Secure proxy tunnel established",
        );
        // Auto-clear status after 2 seconds
        setTimeout(() => setSessionLog(sessionId, null), 2000);
      } catch (err) {
        // Revert optimistic update
        setOpenBrowsers((prev) => prev.filter((id) => id !== sessionId));
        setSessionLog(sessionId, null);

        const message =
          err instanceof Error ? err.message : "Failed to launch browser";
        setError(message);
        throw err;
      } finally {
        setIsOpening(null);
      }
    },
    [setSessionLog],
  );

  const closeSessionBrowser = useCallback(
    async (sessionId: string) => {
      // Optimistic UI update
      setOpenBrowsers((prev) => prev.filter((id) => id !== sessionId));
      setSessionLog(sessionId, "Terminating...");

      try {
        setIsClosing(sessionId);
        const result = await (window as any).prxApi.playwright.closeLocal(
          sessionId,
        );
        if (!result.success) {
          throw new Error(result.error || "Failed to close browser");
        }
        setSessionLog(
          sessionId,
          "Cleanup In Progress",
          "Closing proxy bridge and releasing resources...",
        );
      } catch (err) {
        // Revert optimistic update
        setOpenBrowsers((prev) => [...new Set([...prev, sessionId])]);
        setSessionLog(sessionId, null);

        const message =
          err instanceof Error ? err.message : "Failed to close browser";
        setError(message);
      } finally {
        setIsClosing(null);
      }
    },
    [setSessionLog],
  );

  const showSessionPortal = useCallback(
    async (sessionId: string) => {
      try {
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) throw new Error("Session not found");

        const result = await (window as any).prxApi.playwright.showPortal(
          sessionId,
          null,
          session.proxy,
          session.fingerprint,
          { email: session.email },
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to show portal");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to show portal";
        setError(message);
      }
    },
    [sessions],
  );

  useEffect(() => {
    // Setup listener for browser closed events from main process
    const listenerCleanup = (window as any).prxApi.playwright.onBrowserClosed(
      (sessionId: string) => {
        console.log(`[Context] Browser closed notification for: ${sessionId}`);
        setOpenBrowsers((prev) => prev.filter((id) => id !== sessionId));
        setSessionLog(sessionId, null);
      },
    );

    const syncBrowsers = async () => {
      try {
        const result = await (
          window as any
        ).prxApi.playwright.listConnections();
        if (result.success && result.sessions) {
          setOpenBrowsers(result.sessions);
        }
      } catch (err) {
        console.warn("[Context] Failed to sync active browsers:", err);
      }
    };

    let heartbeatInterval: any = null;

    if (isAuthenticated) {
      fetchSessions();
      syncBrowsers();

      // Reconcile state every 5 seconds
      heartbeatInterval = setInterval(syncBrowsers, 5000);
    } else {
      // Clear sessions when logged out
      setSessions([]);
      setIsLoading(false);
    }

    return () => {
      listenerCleanup();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isAuthenticated, fetchSessions, setSessionLog]);

  const value: SessionContextType = {
    sessions,
    isLoading,
    error,
    refresh: fetchSessions,
    logout,
    deleteMultiple,
    loggingOutId,
    verify,
    verifyingId,
    open,
    isOpening,
    isClosing,
    transitioningSessions,
    openBrowsers,
    launchSessionBrowser,
    closeSessionBrowser,
    showSessionPortal,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
}
