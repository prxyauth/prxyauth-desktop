/**
 * Node agent feature hook — polls the embedded node agent's tunnel state
 * and exposes start/stop actions. The window.prxApi surface is defined
 * in core/types/ipc-contract.ts.
 */

import { useCallback, useEffect, useState } from "react";

export interface NodeAgentStateInfo {
    state: string;
    lastCloseHint: string | null;
    activeSessions: number;
    totalSessions: number;
    reconnectCount: number;
}

export interface NodeRuntimeHook {
    info: NodeAgentStateInfo | null;
    loading: boolean;
    busy: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
}

const POLL_MS = 5_000;

export function useNodeRuntime(): NodeRuntimeHook {
    const [info, setInfo] = useState<NodeAgentStateInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const api = window.prxApi.nodeRuntime;

    const refresh = useCallback(async () => {
        try {
            const infoRes = await api.getInfo();
            if (infoRes.data) setInfo(infoRes.data);
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

    return { info, loading, busy, error, refresh, start, stop };
}