/**
 * useProxyProviders — provider configs on React Query.
 * Public contract unchanged from the hand-rolled version (testResult
 * stays local: one-shot action feedback, not server state).
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proxyProviderApi, ApiError } from "@core/api/client";
import { ProxyProviderConfig, ProxyProviderType, SaveProviderRequest } from "@core/types";

export const proxyProviderKeys = {
    all: ["proxy-providers"] as const,
    list: () => [...proxyProviderKeys.all, "list"] as const,
};

export function useProxyProviders() {
    const client = useQueryClient();
    const [testResult, setTestResult] = useState<{
        provider: ProxyProviderType;
        success: boolean;
        ip?: string;
        error?: string;
    } | null>(null);

    const listQuery = useQuery({
        queryKey: proxyProviderKeys.list(),
        queryFn: () => proxyProviderApi.list(),
        enabled:
            typeof localStorage !== "undefined" && Boolean(localStorage.getItem("prx_token")),
    });

    const saveMutation = useMutation({
        mutationFn: (data: SaveProviderRequest) => proxyProviderApi.save(data),
        onSuccess: () => client.invalidateQueries({ queryKey: proxyProviderKeys.all }),
    });

    const removeMutation = useMutation({
        mutationFn: (provider: ProxyProviderType) => proxyProviderApi.remove(provider),
        onSuccess: () => client.invalidateQueries({ queryKey: proxyProviderKeys.all }),
    });

    const toggleMutation = useMutation({
        mutationFn: (input: { provider: ProxyProviderType; enabled: boolean }) =>
            proxyProviderApi.toggle(input.provider, input.enabled),
        onSuccess: () => client.invalidateQueries({ queryKey: proxyProviderKeys.all }),
    });

    const fetchProviders = useCallback(async () => {
        await listQuery.refetch();
    }, [listQuery]);

    const save = useCallback(
        async (data: SaveProviderRequest): Promise<boolean> => {
            try {
                await saveMutation.mutateAsync(data);
                return true;
            } catch {
                setTestResult(null);
                return false;
            }
        },
        [saveMutation],
    );

    const remove = useCallback(
        async (provider: ProxyProviderType): Promise<boolean> => {
            try {
                await removeMutation.mutateAsync(provider);
                return true;
            } catch {
                return false;
            }
        },
        [removeMutation],
    );

    const toggle = useCallback(
        async (provider: ProxyProviderType, enabled: boolean): Promise<boolean> => {
            try {
                await toggleMutation.mutateAsync({ provider, enabled });
                return true;
            } catch {
                return false;
            }
        },
        [toggleMutation],
    );

    const test = useCallback(async (provider: ProxyProviderType): Promise<boolean> => {
        try {
            const result = await proxyProviderApi.test(provider);
            setTestResult({
                provider,
                success: result.success,
                ip: result.data?.ip,
                error: result.error,
            });
            return result.success;
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to test provider";
            setTestResult({
                provider,
                success: false,
                error: message,
            });
            return false;
        }
    }, []);

    const getProvider = useCallback(
        (type: ProxyProviderType): ProxyProviderConfig | undefined => {
            return listQuery.data?.find((p) => p.provider === type);
        },
        [listQuery.data],
    );

    return {
        providers: listQuery.data ?? [],
        isLoading: listQuery.isLoading,
        error: listQuery.error instanceof Error ? listQuery.error.message : null,
        isSaving: saveMutation.isPending,
        isRemoving: removeMutation.isPending ? removeMutation.variables ?? null : null,
        isTesting: toggleMutation.isPending ? toggleMutation.variables?.provider ?? null : null,
        testResult,
        refresh: fetchProviders,
        save,
        remove,
        toggle,
        test,
        getProvider,
    };
}
