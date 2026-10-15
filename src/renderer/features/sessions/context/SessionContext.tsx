/**
 * Session lifecycle context — browser state ONLY.
 *
 * Sessions server data lives in React Query (hooks/useSessionData);
 * this context owns what genuinely is NOT server state: local browser
 * processes tracked via main-process IPC events, their statuses/logs,
 * and the launch/close/portal flows that drive them.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode,
} from "react";
import type {} from "@core/types/ipc-contract";
import { sessionApi } from "@core/api/client";
import { useAuth } from "@features/auth/hooks/useAuth";

export type BrowserStatus = "launching" | "open" | "closed";

interface SessionLifecycleContextType {
    /** Per-session busy flags (kept as ids for UI affordances). */
    isOpening: string | null;
    isClosing: string | null;
    transitioningSessions: Record<string, { status: string; logs: string[] }>;
    openBrowsers: string[];
    browserStatuses: Record<string, BrowserStatus>;
    launchSessionBrowser: (sessionId: string) => Promise<void>;
    closeSessionBrowser: (sessionId: string) => Promise<void>;
    showSessionPortal: (sessionId: string) => Promise<void>;
    /** Launch-flow error surface (lifecycle errors, not query errors). */
    lifecycleError: string | null;
}

const SessionLifecycleContext = createContext<SessionLifecycleContextType | undefined>(
    undefined,
);

export function SessionProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth();
    const [isOpening, setIsOpening] = useState<string | null>(null);
    const [isClosing, setIsClosing] = useState<string | null>(null);
    const [lifecycleError, setLifecycleError] = useState<string | null>(null);
    const [transitioningSessions, setTransitioningSessions] = useState<
        Record<string, { status: string; logs: string[] }>
    >({});

    // Browser status tracking: source of truth for browser lifecycle
    const [browserStatuses, setBrowserStatuses] = useState<Record<string, BrowserStatus>>({});

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

    const launchSessionBrowser = useCallback(
        async (sessionId: string) => {
            // Optimistic UI update — mark as launching
            setBrowserStatuses((prev) => ({ ...prev, [sessionId]: "launching" }));
            setSessionLog(sessionId, "Initializing...");

            try {
                setIsOpening(sessionId);
                setLifecycleError(null);

                setSessionLog(
                    sessionId,
                    "Authentication Check",
                    "Retrieving credentials from vault...",
                );
                const session = await sessionApi.get(sessionId);
                if (!session) throw new Error("Session not found");

                setSessionLog(sessionId, "Data Sync", "Exporting browser storage state...");
                const storageState = await sessionApi.exportBrowserState(sessionId);

                setSessionLog(sessionId, "Launching", "Applying anti-detection fingerprints...");
                const frontendUrl =
                    localStorage.getItem("prx_frontend_url") ||
                    import.meta.env.VITE_FRONTEND_URL ||
                    "http://localhost:3000";

                const result = await window.prxApi.playwright.launchLocal(
                    sessionId,
                    storageState,
                    session.proxy,
                    session.fingerprint,
                    { email: session.email },
                    frontendUrl,
                );

                if (!result.success) {
                    throw new Error(result.error || "Failed to launch local browser");
                }

                // Main process will emit 'open' status via browserStatusChanged event
                setSessionLog(sessionId, "Connection Ready", "Secure proxy tunnel established");
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

                const message = err instanceof Error ? err.message : "Failed to launch browser";
                setLifecycleError(message);
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
                const result = await window.prxApi.playwright.closeLocal(sessionId);
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

                const message = err instanceof Error ? err.message : "Failed to close browser";
                setLifecycleError(message);
            } finally {
                setIsClosing(null);
            }
        },
        [setSessionLog],
    );

    const showSessionPortal = useCallback(
        async (sessionId: string) => {
            try {
                const session = await sessionApi.get(sessionId);
                if (!session) throw new Error("Session not found");

                const frontendUrl =
                    localStorage.getItem("prx_frontend_url") ||
                    import.meta.env.VITE_FRONTEND_URL ||
                    "http://localhost:3000";
                const result = await window.prxApi.playwright.showPortal(
                    sessionId,
                    null,
                    session.proxy,
                    session.fingerprint,
                    { email: session.email },
                    frontendUrl,
                );

                if (!result.success) {
                    throw new Error(result.error || "Failed to show portal");
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : "Failed to show portal";
                setLifecycleError(message);
            }
        },
        [],
    );

    useEffect(() => {
        // Setup listener for browser closed events from main process (legacy)
        const listenerCleanup = window.prxApi.playwright.onBrowserClosed(
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
        const statusCleanup = window.prxApi.playwright.onBrowserStatusChanged(
            (data: { sessionId: string; status: string }) => {
                console.log(`[Context] Browser status changed: ${data.sessionId} → ${data.status}`);
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
                const result = await window.prxApi.playwright.listConnections();
                if (result.success) {
                    const serverSessions = new Set<string>(result.sessions || []);
                    const serverStatuses: Record<string, string> = result.statuses || {};

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
                                next[id] = (serverStatuses[id] as BrowserStatus) || "open";
                            }
                        }

                        return next;
                    });
                }
            } catch (err) {
                console.warn("[Context] Failed to sync active browsers:", err);
            }
        };

        let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

        if (isAuthenticated) {
            void syncBrowsers();

            // Reconcile state every 5 seconds
            heartbeatInterval = setInterval(() => void syncBrowsers(), 5000);
        } else {
            setBrowserStatuses({});
        }

        return () => {
            listenerCleanup();
            statusCleanup();
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [isAuthenticated, setSessionLog]);

    const value: SessionLifecycleContextType = {
        isOpening,
        isClosing,
        transitioningSessions,
        openBrowsers,
        browserStatuses,
        launchSessionBrowser,
        closeSessionBrowser,
        showSessionPortal,
        lifecycleError,
    };

    return (
        <SessionLifecycleContext.Provider value={value}>
            {children}
        </SessionLifecycleContext.Provider>
    );
}

export function useSessionContext(): SessionLifecycleContextType {
    const context = useContext(SessionLifecycleContext);
    if (context === undefined) {
        throw new Error("useSessionContext must be used within a SessionProvider");
    }
    return context;
}
