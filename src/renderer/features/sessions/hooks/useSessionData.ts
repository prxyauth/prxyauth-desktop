/**
 * Sessions data layer on React Query.
 *
 * The query-key factory is the single source of truth for cache
 * identity; all invalidation goes through it. Views consume these hooks
 * (or the composed useSessions), never sessionApi directly.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "@core/api/client";
import type { Session } from "@core/types";

export const sessionKeys = {
    all: ["sessions"] as const,
    lists: () => [...sessionKeys.all, "list"] as const,
    list: (filters?: unknown) => [...sessionKeys.lists(), { filters }] as const,
    details: () => [...sessionKeys.all, "detail"] as const,
    detail: (id: string) => [...sessionKeys.details(), id] as const,
};

/** Gate queries on login without importing AuthContext (no slice cycle). */
function useAuthenticated(): boolean {
    return typeof localStorage !== "undefined" && Boolean(localStorage.getItem("prx_token"));
}

/** Session list — the dashboard's primary query. */
export function useSessionList() {
    const isAuthenticated = useAuthenticated();
    return useQuery({
        queryKey: sessionKeys.lists(),
        queryFn: () => sessionApi.list(),
        enabled: isAuthenticated,
    });
}

/** Logout a session's remote browser. */
export function useLogoutSession() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (sessionId: string) => sessionApi.logout(sessionId),
        onSuccess: (_data, sessionId) => {
            client.setQueryData<Session[]>(sessionKeys.lists(), (prev) =>
                prev ? prev.filter((s) => s.id !== sessionId) : prev,
            );
        },
    });
}

/** Delete one or more sessions. */
export function useDeleteSessions() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (sessionIds: string[]) => sessionApi.deleteMultiple(sessionIds),
        onSuccess: (_data, sessionIds) => {
            client.setQueryData<Session[]>(sessionKeys.lists(), (prev) =>
                prev ? prev.filter((s) => !sessionIds.includes(s.id)) : prev,
            );
        },
    });
}

/** Re-verify a session's auth state. */
export function useVerifySession() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (sessionId: string) => sessionApi.verify(sessionId),
        onSuccess: (result, sessionId) => {
            client.setQueryData<Session[]>(sessionKeys.lists(), (prev) =>
                prev
                    ? prev.map((s) =>
                          s.id === sessionId ? { ...s, status: result.status as never } : s,
                      )
                    : prev,
            );
        },
    });
}

/** Open a session (remote browser connect). */
export function useOpenSession() {
    return useMutation({
        mutationFn: (sessionId: string) => sessionApi.open(sessionId),
    });
}