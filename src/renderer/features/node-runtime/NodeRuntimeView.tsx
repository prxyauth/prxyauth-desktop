/**
 * NodeRuntimeView — the "Self-Hosted Node" section.
 *
 * Shows the embedded node server's lifecycle state in product language:
 * status dot + human sentence, tunnel close codes translated to actions
 * (4005 → subscription expired → renew), start/stop, diagnostics facts.
 * Deliberately NOT a log viewer — phase 3 adds the provisioning flow.
 */

import { useNodeRuntime } from "./hooks/useNodeRuntime";
import { Cpu, Play, RefreshCw, Square } from "lucide-react";

interface StatusPresentation {
    dot: string;
    headline: string;
    detail: string;
}

function presentStatus(
    status: string,
    restartCount: number,
    lastCrashAt: string | null,
): StatusPresentation {
    switch (status) {
        case "running":
            return {
                dot: "bg-emerald-400",
                headline: "Node running",
                detail: "Tunnel connected — your self-hosted auth sessions run on this machine's Chrome.",
            };
        case "starting":
            return {
                dot: "bg-amber-400 animate-pulse",
                headline: "Node starting…",
                detail: "Waiting for the server's health endpoint to answer.",
            };
        case "stopped":
            return {
                dot: "bg-slate-500",
                headline: "Node stopped",
                detail: "Start the node to connect the tunnel and serve self-hosted sessions.",
            };
        case "crashed":
            return {
                dot: "bg-rose-500",
                headline: "Node crashed — restarting",
                detail: restartCount
                    ? `Auto-restart #${restartCount}${lastCrashAt ? ` at ${new Date(lastCrashAt).toLocaleTimeString()}` : ""}. Bounded backoff: 1s → 5s → 15s → 60s.`
                    : "The node process exited unexpectedly. Auto-restart with bounded backoff engaged.",
            };
        default:
            return {
                dot: "bg-slate-500",
                headline: "Node runtime not installed",
                detail: "The embedded node payload is missing. Reinstall the app to restore it.",
            };
    }
}

export function NodeRuntimeView() {
    const { info, installed, loading, busy, error, start, stop, refresh } = useNodeRuntime();

    const p = presentStatus(info?.status ?? "stopped", info?.restartCount ?? 0, info?.lastCrashAt ?? null);
    const isRunning = info?.status === "running";

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <header className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-slate-100">Self-Hosted Node</h1>
                    <p className="text-sm text-slate-400">
                        The node server embedded in this app — your machine's Chrome serves your self-hosted auth sessions.
                    </p>
                </div>
            </header>

            {loading ? (
                <div className="text-slate-400 text-sm">Checking node state…</div>
            ) : !installed ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2">
                    <p className="text-slate-200 font-medium">Node runtime not installed</p>
                    <p className="text-sm text-slate-400">
                        The embedded node payload is missing from this installation. Reinstall the
                        app to restore it.
                    </p>
                </div>
            ) : (
                <>
                    <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <span className={`w-3 h-3 rounded-full ${p.dot}`} />
                                <div>
                                    <p className="text-slate-100 font-medium">{p.headline}</p>
                                    <p className="text-sm text-slate-400">{p.detail}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => void refresh()}
                                    className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-4 h-4 text-slate-400" />
                                </button>
                                {isRunning ? (
                                    <button
                                        onClick={() => void stop()}
                                        disabled={busy}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
                                    >
                                        <Square className="w-4 h-4" />
                                        {busy ? "Stopping…" : "Stop node"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => void start()}
                                        disabled={busy}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/30 text-slate-100 text-sm hover:bg-primary/20 disabled:opacity-50 transition-colors"
                                    >
                                        <Play className="w-4 h-4" />
                                        {busy ? "Starting…" : "Start node"}
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                                {error}
                            </p>
                        )}
                    </section>

                    <section className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
                        <Row label="Status" value={info?.status ?? "—"} />
                        <Row label="Port" value={info ? `127.0.0.1:${info.port}` : "—"} />
                        <Row
                            label="Process ID"
                            value={info?.pid ? String(info.pid) : "not running"}
                        />
                        <Row
                            label="Last exit code"
                            value={
                                info?.lastExitCode == null ? "—" : String(info.lastExitCode)
                            }
                        />
                        <Row label="Auto-restarts" value={String(info?.restartCount ?? 0)} />
                    </section>
                </>
            )}
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-400">{label}</span>
            <span className="text-sm text-slate-200 font-mono">{value}</span>
        </div>
    );
}