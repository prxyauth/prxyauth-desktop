import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import { Session } from "@core/types";
import { sessionApi, ApiError } from "@core/api/client";
import { useAuth } from "@features/auth/hooks/useAuth";

export type BrowserStatus = "launching" | "open" | "closed";

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
  browserStatuses: Record<string, BrowserStatus>;
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

  // Browser status tracking: source of truth for browser lifecycle
  const [browserStatuses, setBrowserStatuses] = useState<
    Record<string, BrowserStatus>
  >({});

  // Derive openBrowsers for backward compatibility
  const openBrowsers = useMemo(
    () =>
      Object.entries(browserStatuses)
        .filter(([, status]) => status === "launching" || status === "open")
        .map(([id]) => id),
    [browserStatuses],
  );


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
      // Optimistic UI update — mark as launching
      setBrowserStatuses((prev) => ({ ...prev, [sessionId]: "launching" }));
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
          "Launching",
          "Applying anti-detection fingerprints...",
        );
        const frontendUrl = localStorage.getItem("prx_frontend_url") || import.meta.env.VITE_FRONTEND_URL || "http://localhost:3000";
        const result = await (window as any).prxApi.playwright.launchLocal(
          sessionId,
          storageState,
          session.proxy,
          session.fingerprint,
          { email: session.email },
          frontendUrl
        );

        if (!result.success) {
          throw new Error(result.error || "Failed to launch local browser");
        }

        // Main process will emit 'open' status via browserStatusChanged event
        setSessionLog(
          sessionId,
          "Connection Ready",
          "Secure proxy tunnel established",
        );
        // Auto-clear status after 2 seconds
        setTimeout(() => setSessionLog(sessionId, null), 2000);
      } catch (err) {
        // Revert optimistic update
        setBrowserStatuses((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
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
      // Optimistic UI update — remove from tracked
      setBrowserStatuses((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      setSessionLog(sessionId, "Terminating...");

      try {
        setIsClosing(sessionId);
        const result = await (window as any).prxApi.playwright.closeLocal(
          sessionId,
        );
        if (!result.success) {
          throw new Error(result.error || "Failed to close browser");
        }
        // Browser is already closed and cleaned up by main process at this point.
        // The disconnected handler has already emitted events to clear state.
        setSessionLog(sessionId, null);
      } catch (err) {
        // Revert optimistic update — mark as open again
        setBrowserStatuses((prev) => ({ ...prev, [sessionId]: "open" }));
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

        const frontendUrl = localStorage.getItem("prx_frontend_url") || import.meta.env.VITE_FRONTEND_URL || "http://localhost:3000";
        const result = await (window as any).prxApi.playwright.showPortal(
          sessionId,
          null,
          session.proxy,
          session.fingerprint,
          { email: session.email },
          frontendUrl
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
    // Setup listener for browser closed events from main process (legacy)
    const listenerCleanup = (window as any).prxApi.playwright.onBrowserClosed(
      (sessionId: string) => {
        console.log(`[Context] Browser closed notification for: ${sessionId}`);
        setBrowserStatuses((prev) => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
        });
        setSessionLog(sessionId, null);
      },
    );

    // Setup listener for browser status change events (primary)
    const statusCleanup = (
      window as any
    ).prxApi.playwright.onBrowserStatusChanged(
      (data: { sessionId: string; status: string }) => {
        console.log(
          `[Context] Browser status changed: ${data.sessionId} → ${data.status}`,
        );
        if (data.status === "closed") {
          setBrowserStatuses((prev) => {
            const next = { ...prev };
            delete next[data.sessionId];
            return next;
          });
          setSessionLog(data.sessionId, null);
        } else {
          setBrowserStatuses((prev) => ({
            ...prev,
            [data.sessionId]: data.status as BrowserStatus,
          }));
        }
      },
    );

    const syncBrowsers = async () => {
      try {
        const result = await (
          window as any
        ).prxApi.playwright.listConnections();
        if (result.success) {
          const serverSessions = new Set<string>(result.sessions || []);
          const serverStatuses: Record<string, string> =
            result.statuses || {};

          setBrowserStatuses((prev) => {
            const next = { ...prev };

            // Remove entries the server doesn't know about
            // (but preserve 'launching' state for browsers not yet registered)
            for (const id of Object.keys(next)) {
              if (!serverSessions.has(id) && next[id] !== "launching") {
                delete next[id];
              }
            }

            // Add/update entries from server
            for (const id of serverSessions) {
              if (!next[id] || next[id] === "launching") {
                next[id] =
                  (serverStatuses[id] as BrowserStatus) || "open";
              }
            }

            return next;
          });
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
      statusCleanup();
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
    browserStatuses,
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
