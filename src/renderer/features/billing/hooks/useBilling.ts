/**
 * Billing slice data hooks — React Query.
 *
 * The ONLY sanctioned entry to billingApi for consumers that used to
 * import it directly (marketplace views, transactions view, shared
 * banner/modal). Query-key factory owns cache identity.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@core/api/client";

export const billingKeys = {
    all: ["billing"] as const,
    licenses: () => [...billingKeys.all, "licenses"] as const,
    transactions: () => [...billingKeys.all, "transactions"] as const,
    transaction: (id: string) => [...billingKeys.all, "transaction", id] as const,
    marketplaceProviders: () => [...billingKeys.all, "marketplace-providers"] as const,
    provisioning: (providerId: string) => [...billingKeys.all, "provisioning", providerId] as const,
};

function useAuthenticated(): boolean {
    return typeof localStorage !== "undefined" && Boolean(localStorage.getItem("prx_token"));
}

interface ListQueryOptions {
    refetchInterval?: number;
}

/** Provider licenses list. */
export function useLicenses(options: ListQueryOptions = {}) {
    const isAuthenticated = useAuthenticated();
    return useQuery({
        queryKey: billingKeys.licenses(),
        queryFn: () => billingApi.listLicenses(),
        enabled: isAuthenticated,
        ...options,
    });
}

/** Payment transactions list. */
export function useTransactions(options: ListQueryOptions = {}) {
    const isAuthenticated = useAuthenticated();
    return useQuery({
        queryKey: billingKeys.transactions(),
        queryFn: () => billingApi.listTransactions(),
        enabled: isAuthenticated,
        ...options,
    });
}

/** Provisioning data for a provider (session launch prerequisites). */
export function useProvisioning(providerId: string | null) {
    return useQuery({
        queryKey: billingKeys.provisioning(providerId ?? "none"),
        queryFn: () => billingApi.getProvisioningData(providerId as string),
        enabled: Boolean(providerId),
    });
}

/** Marketplace provider catalog. */
export function useMarketplaceProviders() {
    const isAuthenticated = useAuthenticated();
    return useQuery({
        queryKey: billingKeys.marketplaceProviders(),
        queryFn: () => billingApi.listMarketplaceProviders(),
        enabled: isAuthenticated,
    });
}

/** Single payment transaction (polled by the payment page). */
export function useTransaction(id: string | null, options: ListQueryOptions = {}) {
    return useQuery({
        queryKey: billingKeys.transaction(id ?? "none"),
        queryFn: () => billingApi.getTransaction(id as string),
        enabled: Boolean(id),
        ...options,
    });
}

/** Start a checkout for a provider license. */
export function useCheckout() {
    return useMutation({
        mutationFn: (input: {
            provider: string;
            durationMonths?: number;
            paymentMethod?: string;
        }) => billingApi.checkout(input),
    });
}

/** Verify a payment transaction (TRON). */
export function useVerifyPayment() {
    const client = useQueryClient();
    return useMutation({
        mutationFn: (transactionId: string) => billingApi.verifyPayment(transactionId),
        onSuccess: () => client.invalidateQueries({ queryKey: billingKeys.all }),
    });
}