/**
 * useApiKeys Hook
 * Handles fetching, generating, and revoking API keys
 */

import { useState, useCallback, useEffect } from "react";
import { apiKeyApi } from "@core/api/client";
import { ApiKey, GenerateApiKeyRequest } from "@core/types";

export function useApiKeys() {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiKeyApi.list();
            setKeys(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch API keys");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const generate = async (data: GenerateApiKeyRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await apiKeyApi.generate(data);
            if (result.success) {
                await refresh();
                return result.data;
            } else {
                setError(result.error || "Failed to generate API key");
                return null;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate API key");
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const revoke = async (keyId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await apiKeyApi.revoke(keyId);
            if (result.success) {
                await refresh();
                return true;
            } else {
                setError(result.message || "Failed to revoke API key");
                return false;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to revoke API key");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        keys,
        isLoading,
        error,
        refresh,
        generate,
        revoke,
    };
}
