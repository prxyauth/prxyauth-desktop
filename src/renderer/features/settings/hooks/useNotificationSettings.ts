/**
 * useNotificationSettings — notification config on React Query.
 * Public contract unchanged from the hand-rolled version (testMessage
 * stays local: it is UI feedback about a one-shot action, not server
 * state).
 */

import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi, ApiError } from "@core/api/client";
import { SaveNotificationRequest } from "@core/types";

export const notificationKeys = {
    all: ["notification-settings"] as const,
    detail: () => [...notificationKeys.all, "detail"] as const,
};

export function useNotificationSettings() {
    const client = useQueryClient();
    const [testMessage, setTestMessage] = useState<string | null>(null);

    const settingsQuery = useQuery({
        queryKey: notificationKeys.detail(),
        queryFn: () => notificationApi.getSettings(),
        enabled:
            typeof localStorage !== "undefined" && Boolean(localStorage.getItem("prx_token")),
    });

    const saveMutation = useMutation({
        mutationFn: (data: SaveNotificationRequest) => notificationApi.saveSettings(data),
        onSuccess: () => client.invalidateQueries({ queryKey: notificationKeys.all }),
    });

    const testMutation = useMutation({
        mutationFn: (data: SaveNotificationRequest) => notificationApi.testSettings(data),
    });

    const fetchSettings = useCallback(async () => {
        await settingsQuery.refetch();
    }, [settingsQuery]);

    const save = useCallback(
        async (data: SaveNotificationRequest) => {
            try {
                await saveMutation.mutateAsync(data);
                return true;
            } catch {
                return false;
            }
        },
        [saveMutation],
    );

    const test = useCallback(
        async (data: SaveNotificationRequest) => {
            setTestMessage(null);
            try {
                const result = await testMutation.mutateAsync(data);
                setTestMessage(result.message);
                return true;
            } catch (err) {
                const message =
                    err instanceof ApiError ? err.message : "Failed to send test notification";
                setTestMessage(message);
                return false;
            }
        },
        [testMutation],
    );

    return {
        settings: settingsQuery.data ?? null,
        isLoading: settingsQuery.isLoading,
        error: settingsQuery.error instanceof Error ? settingsQuery.error.message : null,
        isSaving: saveMutation.isPending,
        isTesting: testMutation.isPending,
        testMessage,
        save,
        test,
        refresh: fetchSettings,
    };
}
