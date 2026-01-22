/**
 * useProxies - Custom hook for proxy management
 */

import { useState, useEffect, useCallback } from "react";
import { proxyApi, ApiError } from "@core/api/client";
import { ProxyHealthInfo, ProxyPoolStats, ProxyConfig } from "@core/types";

interface UseProxiesReturn {
    stats: ProxyPoolStats | null;
    proxies: ProxyHealthInfo[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    add: (proxy: ProxyConfig, validate?: boolean) => Promise<boolean>;
    remove: (server: string) => Promise<boolean>;
    validate: (proxy: ProxyConfig) => Promise<{ success: boolean; ip?: string; latency?: number; message?: string }>;
    isAdding: boolean;
    isRemoving: string | null;
    isValidating: boolean;
}

export function useProxies(): UseProxiesReturn {
    const [stats, setStats] = useState<ProxyPoolStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isRemoving, setIsRemoving] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await proxyApi.getStats();
            setStats(data);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to load proxy stats";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Only refresh if token exists
        if (localStorage.getItem("prx_token")) {
            refresh();
        }
    }, [refresh]);

    const add = useCallback(async (proxy: ProxyConfig, validate: boolean = true): Promise<boolean> => {
        setIsAdding(true);
        setError(null);
        try {
            const response = await proxyApi.add({ ...proxy, validate });
            if (response.success) {
                await refresh();
                return true;
            }
            throw new Error(response.error || "Failed to add proxy");
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to add proxy";
            setError(message);
            return false;
        } finally {
            setIsAdding(false);
        }
    }, [refresh]);

    const remove = useCallback(async (server: string): Promise<boolean> => {
        setIsRemoving(server);
        setError(null);
        try {
            const response = await proxyApi.remove(server);
            if (response.success) {
                await refresh();
                return true;
            }
            throw new Error(response.error || "Failed to remove proxy");
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to remove proxy";
            setError(message);
            return false;
        } finally {
            setIsRemoving(null);
        }
    }, [refresh]);

    const validate = useCallback(async (proxy: ProxyConfig) => {
        setIsValidating(true);
        try {
            const response = await proxyApi.validate(proxy);
            if (response.success && response.data) {
                return {
                    success: true,
                    ip: response.data.ip,
                    latency: response.data.latency,
                    message: response.data.message
                };
            }
            return {
                success: false,
                message: response.error || "Validation failed"
            };
        } catch (err) {
            return {
                success: false,
                message: err instanceof ApiError ? err.message : "Validation failed"
            };
        } finally {
            setIsValidating(false);
        }
    }, []);

    return {
        stats,
        proxies: stats?.proxies || [],
        isLoading,
        error,
        refresh,
        add,
        remove,
        validate,
        isAdding,
        isRemoving,
        isValidating,
    };
}
