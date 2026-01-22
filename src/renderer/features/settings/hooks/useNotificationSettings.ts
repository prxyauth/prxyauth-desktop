import { useState, useEffect, useCallback } from "react";
import { notificationApi, ApiError } from "@core/api/client";
import { NotificationSettings, SaveNotificationRequest } from "@core/types";

export function useNotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testMessage, setTestMessage] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await notificationApi.getSettings();
            setSettings(data);
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to fetch notification settings";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Only fetch if token exists
        if (localStorage.getItem("prx_token")) {
            fetchSettings();
        }
    }, [fetchSettings]);

    const save = async (data: SaveNotificationRequest) => {
        try {
            setIsSaving(true);
            setError(null);
            await notificationApi.saveSettings(data);
            await fetchSettings();
            return true;
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to save settings";
            setError(message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const test = async (data: SaveNotificationRequest) => {
        try {
            setIsTesting(true);
            setError(null);
            setTestMessage(null);
            const result = await notificationApi.testSettings(data);
            setTestMessage(result.message);
            return true;
        } catch (err) {
            const message = err instanceof ApiError ? err.message : "Failed to send test notification";
            setError(message);
            return false;
        } finally {
            setIsTesting(false);
        }
    };

    return {
        settings,
        isLoading,
        error,
        isSaving,
        isTesting,
        testMessage,
        save,
        test,
        refresh: fetchSettings
    };
}
