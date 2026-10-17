/**
 * Provisioning hook — the one-click onboarding flow.
 *
 * The renderer owns the session token + backend URL (localStorage, same
 * as every other API call); main performs registration + .env + start.
 * Key material never crosses the bridge.
 */

import { useCallback, useEffect, useState } from "react";

export interface ProvisioningHook {
    provisioned: boolean | null;
    checking: boolean;
    busy: boolean;
    error: string | null;
    /** "license-required" | "limit-reached" | null */
    failureKind: string | null;
    enable: () => Promise<void>;
}

export function useProvisioning(onProvisioned?: () => void): ProvisioningHook {
    const [provisioned, setProvisioned] = useState<boolean | null>(null);
    const [checking, setChecking] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [failureKind, setFailureKind] = useState<string | null>(null);

    const api = window.prxApi.nodeProvisioning;

    const checkStatus = useCallback(async () => {
        try {
            const res = await api.status();
            setProvisioned(res.data?.provisioned ?? false);
        } catch {
            setProvisioned(false);
        } finally {
            setChecking(false);
        }
    }, [api]);

    useEffect(() => {
        void checkStatus();
    }, [checkStatus]);

    const enable = useCallback(async () => {
        setBusy(true);
        setError(null);
        setFailureKind(null);
        try {
            const backendUrl =
                localStorage.getItem("prx_api_url") ||
                (import.meta.env.VITE_API_URL as string | undefined) ||
                "http://localhost:8000";
            const token = localStorage.getItem("prx_token");
            if (!token) {
                setError("Not signed in — log in first.");
                return;
            }
            const res = await api.enable({ backendUrl, token });
            if (!res.success) {
                setError(res.error || "Provisioning failed.");
                setFailureKind(res.message || null);
                return;
            }
            setProvisioned(true);
            onProvisioned?.();
        } catch (err) {
            setError(String(err));
        } finally {
            setBusy(false);
        }
    }, [api, onProvisioned]);

    return { provisioned, checking, busy, error, failureKind, enable };
}