/**
 * useSubscriptions — provider licenses on React Query.
 * Public contract unchanged from the hand-rolled version.
 */

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@core/api/client";
import { ProviderLicense } from "@core/types";

export const subscriptionKeys = {
    all: ["subscriptions"] as const,
    list: () => [...subscriptionKeys.all, "list"] as const,
};

interface UseSubscriptionsReturn {
    subscriptions: ProviderLicense[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsReturn {
    const listQuery = useQuery({
        queryKey: subscriptionKeys.list(),
        queryFn: () => billingApi.listLicenses(),
        enabled:
            typeof localStorage !== "undefined" && Boolean(localStorage.getItem("prx_token")),
    });

    const refresh = useCallback(async () => {
        await listQuery.refetch();
    }, [listQuery]);

    return {
        subscriptions: listQuery.data ?? [],
        isLoading: listQuery.isLoading,
        error: listQuery.error instanceof Error ? listQuery.error.message : null,
        refresh,
    };
}
