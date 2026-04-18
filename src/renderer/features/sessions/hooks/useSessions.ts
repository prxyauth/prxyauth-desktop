/**
 * useSessions Hook
 */

import { useSessionContext, BrowserStatus } from "../context/SessionContext";
import { Session } from "@core/types";

export interface UseSessionsReturn {
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

export function useSessions(): UseSessionsReturn {
    return useSessionContext();
}
