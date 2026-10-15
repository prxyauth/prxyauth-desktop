/**
 * useSessions — the view-facing composed hook for the sessions slice.
 *
 * Contract-compatible with the pre-migration context surface so views
 * (DashboardView, SessionDetailPage, TopNavbar) did not need to change
 * in the same pass. Data comes from React Query (useSessionData),
 * browser-lifecycle state from the slim SessionContext.
 */

import { useCallback } from "react";
import type { Session } from "@core/types";
import {
    useSessionList,
    useLogoutSession,
    useDeleteSessions,
    useVerifySession,
    useOpenSession,
} from "./useSessionData";
import { useSessionContext, type BrowserStatus } from "../context/SessionContext";

export type { BrowserStatus };

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
    // Server state (React Query)
    const listQuery = useSessionList();
    const logoutMutation = useLogoutSession();
    const deleteMutation = useDeleteSessions();
    const verifyMutation = useVerifySession();
    const openMutation = useOpenSession();

    // Browser lifecycle (context)
    const {
        isOpening,
        isClosing,
        transitioningSessions,
        openBrowsers,
        browserStatuses,
        launchSessionBrowser,
        closeSessionBrowser,
        showSessionPortal,
        lifecycleError,
    } = useSessionContext();

    const refresh = useCallback(async () => {
        await listQuery.refetch();
    }, [listQuery]);

    const logout = useCallback(
        async (sessionId: string): Promise<boolean> => {
            try {
                await logoutMutation.mutateAsync(sessionId);
                return true;
            } catch {
                return false;
            }
        },
        [logoutMutation],
    );

    const deleteMultiple = useCallback(
        async (sessionIds: string[]): Promise<boolean> => {
            try {
                await deleteMutation.mutateAsync(sessionIds);
                return true;
            } catch {
                return false;
            }
        },
        [deleteMutation],
    );

    const verify = useCallback(
        async (sessionId: string): Promise<boolean> => {
            try {
                const result = await verifyMutation.mutateAsync(sessionId);
                return result.success;
            } catch {
                return false;
            }
        },
        [verifyMutation],
    );

    const open = useCallback(
        async (sessionId: string): Promise<boolean> => {
            try {
                const result = await openMutation.mutateAsync(sessionId);
                return result.success;
            } catch {
                return false;
            }
        },
        [openMutation],
    );

    return {
        sessions: listQuery.data ?? [],
        isLoading: listQuery.isLoading,
        error: listQuery.error instanceof Error ? listQuery.error.message : lifecycleError,
        refresh,
        logout,
        deleteMultiple,
        loggingOutId: null, // per-id pending lives on logoutMutation.variables/isPending
        verify,
        verifyingId: verifyMutation.isPending ? verifyMutation.variables ?? null : null,
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
}