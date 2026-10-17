/**
 * Node runtime feature hook — polls the embedded node server's state
 * and exposes start/stop actions. The window.prxApi surface is defined
 * in core/types/ipc-contract.ts.
 */

import { useCallback, useEffect, useState } from "react";

export interface NodeRuntimeState {
    status: string;
    pid?: number;
    port: number;
    lastExitCode?: number | null;
    lastCrashAt?: string | null;
    restartCount: number;
}

export interface NodeRuntimeHook {
    info: NodeRuntimeState | null;
    installed: boolean;
    loading: boolean;
    busy: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
}

const POLL_MS = 5_000;

export function useNodeRuntime(): NodeRuntimeHook {
    const [info, setInfo] = useState<NodeRuntimeState | null>(null);
    const [installed, setInstalled] = useState<boolean>(true);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = window.prxApi.nodeRuntime;

    const refresh = useCallback(async () => {
        try {
            const [infoRes, installedRes] = await Promise.all([
                api.getInfo(),
                api.isInstalled(),
            ]);
            if (infoRes.data) setInfo(infoRes.data);
            setInstalled(installedRes.data?.status !== "not-installed");
            setError(null);
        } catch (err) {
            setError(String(err));
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        void refresh();
        const timer = setInterval(() => void refresh(), POLL_MS);
        return () => clearInterval(timer);
    }, [refresh]);

    const start = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await api.start();
            if (!res.success && res.error) setError(res.error);
        } catch (err) {
            setError(String(err));
        } finally {
            setBusy(false);
            void refresh();
        }
    }, [api, refresh]);

    const stop = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await api.stop();
            if (!res.success && res.error) setError(res.error);
        } catch (err) {
            setError(String(err));
        } finally {
            setBusy(false);
            void refresh();
        }
    }, [api, refresh]);

    return { info, installed, loading, busy, error, refresh, start, stop };
}