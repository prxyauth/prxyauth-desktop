/**
 * useSubscriptions Hook
 * Manages provider subscription state for Electron
 */

import { useState, useEffect, useCallback } from "react";
import { billingApi } from "@core/api/client";
import { ProviderLicense } from "@core/types";

interface UseSubscriptionsReturn {
  subscriptions: ProviderLicense[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSubscriptions(): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<ProviderLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const licenses = await billingApi.listLicenses();
      setSubscriptions(licenses);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load subscriptions",
      );
      console.error("Error fetching subscriptions:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    isLoading,
    error,
    refresh: fetchSubscriptions,
  };
}
