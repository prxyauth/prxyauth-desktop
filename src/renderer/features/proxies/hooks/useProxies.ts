/**
 * useProxies — proxy pool data on React Query.
 *
 * Public contract unchanged from the hand-rolled version so views did
 * not need to change; internally queries/mutations own the state.
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proxyApi, ApiError } from "@core/api/client";
import { ProxyHealthInfo, ProxyPoolStats, ProxyConfig } from "@core/types";

export const proxyKeys = {
    all: ["proxies"] as const,
    stats: () => [...proxyKeys.all, "stats"] as const,
};

interface UseProxiesReturn {
    stats: ProxyPoolStats | null;
    proxies: ProxyHealthInfo[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    add: (proxy: ProxyConfig, validate?: boolean) => Promise<boolean>;
    remove: (server: string) => Promise<boolean>;
    validate: (
        proxy: ProxyConfig,
    ) => Promise<{ success: boolean; ip?: string; latency?: number; message?: string }>;
    isAdding: boolean;
    isRemoving: string | null;
    isValidating: boolean;
}

export function useProxies(): UseProxiesReturn {
    const client = useQueryClient();
    const [isValidating, setIsValidating] = useState(false);

    const statsQuery = useQuery({
        queryKey: proxyKeys.stats(),
        queryFn: () => proxyApi.getStats(),
        enabled: typeof localStorage !== "undefined" && Boolean(localStorage.getItem("prx_token")),
    });

    const addMutation = useMutation({
        mutationFn: (input: { proxy: ProxyConfig; validate: boolean }) =>
            proxyApi.add({ ...input.proxy, validate: input.validate }),
        onSuccess: () => client.invalidateQueries({ queryKey: proxyKeys.all }),
    });

    const removeMutation = useMutation({
        mutationFn: (server: string) => proxyApi.remove(server),
        onSuccess: () => client.invalidateQueries({ queryKey: proxyKeys.all }),
    });

    const refresh = useCallback(async () => {
        await statsQuery.refetch();
    }, [statsQuery]);

    const add = useCallback(
        async (proxy: ProxyConfig, validate: boolean = true): Promise<boolean> => {
            try {
                const response = await addMutation.mutateAsync({ proxy, validate });
                if (response.success) return true;
                throw new Error(response.error || "Failed to add proxy");
            } catch {
                return false;
            }
        },
        [addMutation],
    );

    const remove = useCallback(
        async (server: string): Promise<boolean> => {
            try {
                const response = await removeMutation.mutateAsync(server);
                if (response.success) return true;
                throw new Error(response.error || "Failed to remove proxy");
            } catch {
                return false;
            }
        },
        [removeMutation],
    );

    const validate = useCallback(
        async (proxy: ProxyConfig) => {
            setIsValidating(true);
            try {
                const response = await proxyApi.validate(proxy);
                if (response.success && response.data) {
                    return {
                        success: true,
                        ip: response.data.ip,
                        latency: response.data.latency,
                        message: response.data.message,
                    };
                }
                return {
                    success: false,
                    message: response.error || "Validation failed",
                };
            } catch (err) {
                return {
                    success: false,
                    message: err instanceof ApiError ? err.message : "Validation failed",
                };
            } finally {
                setIsValidating(false);
            }
        },
        [],
    );

    return {
        stats: statsQuery.data ?? null,
        proxies: statsQuery.data?.proxies || [],
        isLoading: statsQuery.isLoading,
        error: statsQuery.error instanceof Error ? statsQuery.error.message : null,
        refresh,
        add,
        remove,
        validate,
        isAdding: addMutation.isPending,
        isRemoving: removeMutation.isPending ? removeMutation.variables ?? null : null,
        isValidating,
    };
}
