/**
 * useApiKeys — API key management on React Query.
 *
 * Public contract unchanged from the hand-rolled version so views did
 * not need to change; internally queries/mutations own the state.
 */

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiKeyApi } from "@core/api/client";
import { GenerateApiKeyRequest } from "@core/types";

export const apiKeyKeys = {
    all: ["api-keys"] as const,
    list: () => [...apiKeyKeys.all, "list"] as const,
};

export function useApiKeys() {
    const client = useQueryClient();

    const listQuery = useQuery({
        queryKey: apiKeyKeys.list(),
        queryFn: () => apiKeyApi.list(),
    });

    const generateMutation = useMutation({
        mutationFn: (data: GenerateApiKeyRequest) => apiKeyApi.generate(data),
        onSuccess: () => client.invalidateQueries({ queryKey: apiKeyKeys.all }),
    });

    const revokeMutation = useMutation({
        mutationFn: (keyId: string) => apiKeyApi.revoke(keyId),
        onSuccess: () => client.invalidateQueries({ queryKey: apiKeyKeys.all }),
    });

    const refresh = useCallback(async () => {
        await listQuery.refetch();
    }, [listQuery]);

    const generate = useCallback(async (data: GenerateApiKeyRequest) => {
        try {
            const result = await generateMutation.mutateAsync(data);
            if (result.success) {
                return result.data;
            }
            return null;
        } catch {
            return null;
        }
    }, [generateMutation]);

    const revoke = useCallback(async (keyId: string) => {
        try {
            const result = await revokeMutation.mutateAsync(keyId);
            return Boolean(result.success);
        } catch {
            return false;
        }
    }, [revokeMutation]);

    return {
        keys: listQuery.data ?? [],
        isLoading: listQuery.isLoading || generateMutation.isPending || revokeMutation.isPending,
        error: listQuery.error instanceof Error ? listQuery.error.message : null,
        refresh,
        generate,
        revoke,
    };
}
