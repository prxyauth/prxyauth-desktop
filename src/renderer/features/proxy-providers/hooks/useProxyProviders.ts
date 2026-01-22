/**
 * useProxyProviders Hook
 */

import { useState, useEffect, useCallback } from "react";
import { proxyProviderApi, ApiError } from "@core/api/client";
import { ProxyProviderConfig, ProxyProviderType, SaveProviderRequest } from "@core/types";

export function useProxyProviders() {
    const [providers, setProviders] = useState<ProxyProviderConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isRemoving, setIsRemoving] = useState<ProxyProviderType | null>(null);
    const [isTesting, setIsTesting] = useState<ProxyProviderType | null>(null);
    const [testResult, setTestResult] = useState<{ provider: ProxyProviderType; success: boolean; ip?: string; error?: string } | null>(null);

    // Fetch providers
    const fetchProviders = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await proxyProviderApi.list();
            setProviders(data);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to fetch providers";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load on mount
    useEffect(() => {
        if (localStorage.getItem("prx_token")) {
            fetchProviders();
        }
    }, [fetchProviders]);

    // Save provider
    const save = useCallback(async (data: SaveProviderRequest): Promise<boolean> => {
        try {
            setIsSaving(true);
            setError(null);
            await proxyProviderApi.save(data);
            await fetchProviders();
            return true;
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to save provider";
            setError(message);
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [fetchProviders]);

    // Remove provider
    const remove = useCallback(async (provider: ProxyProviderType): Promise<boolean> => {
        try {
            setIsRemoving(provider);
            setError(null);
            await proxyProviderApi.remove(provider);
            await fetchProviders();
            return true;
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to remove provider";
            setError(message);
            return false;
        } finally {
            setIsRemoving(null);
        }
    }, [fetchProviders]);

    // Toggle provider
    const toggle = useCallback(async (provider: ProxyProviderType, enabled: boolean): Promise<boolean> => {
        try {
            setError(null);
            await proxyProviderApi.toggle(provider, enabled);
            await fetchProviders();
            return true;
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to toggle provider";
            setError(message);
            return false;
        }
    }, [fetchProviders]);

    // Test provider credentials
    const test = useCallback(async (provider: ProxyProviderType): Promise<boolean> => {
        try {
            setIsTesting(provider);
            setTestResult(null);
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
        } finally {
            setIsTesting(null);
        }
    }, []);

    // Get provider by type
    const getProvider = useCallback((type: ProxyProviderType): ProxyProviderConfig | undefined => {
        return providers.find(p => p.provider === type);
    }, [providers]);

    return {
        providers,
        isLoading,
        error,
        isSaving,
        isRemoving,
        isTesting,
        testResult,
        refresh: fetchProviders,
        save,
        remove,
        toggle,
        test,
        getProvider,
    };
}
