/**
 * NodeRuntimeView — the "Self-Hosted Node" section.
 *
 * Shows the embedded node agent's tunnel state in product language:
 * status dot + human sentence, close-code hints translated to actions
 * (4005 → subscription expired → renew), start/stop, session facts.
 */

import { useNodeRuntime } from "./hooks/useNodeRuntime";
import { useProvisioning } from "./hooks/useProvisioning";
import { useCallback, useEffect, useState } from "react";
import { Cpu, Globe, Play, RefreshCw, Square } from "lucide-react";

interface BrowserInfo {
    system: string | null;
    managed: string | null;
    choice: string;
    resolved: { path: string; kind: string } | null;
}

interface StatusPresentation {
    dot: string;
    headline: string;
    detail: string;
}

function presentStatus(
    state: string,
    closeHint: string | null,
    activeSessions: number,
): StatusPresentation {
    switch (state) {
        case "online":
            return {
                dot: "bg-emerald-400",
                headline: "Node online",
                detail:
                    activeSessions > 0
                        ? `Tunnel connected — serving ${activeSessions} session${activeSessions > 1 ? "s" : ""} on this machine's Chrome.`
                        : "Tunnel connected — your self-hosted auth sessions run on this machine's Chrome.",
            };
        case "connecting":
            return {
                dot: "bg-amber-400 animate-pulse",
                headline: "Connecting…",
                detail: "Opening the tunnel to your prxyauth backend.",
            };
        case "reconnecting":
            return {
                dot: "bg-amber-400 animate-pulse",
                headline: "Reconnecting…",
                detail: "The tunnel dropped — retrying with backoff (1s → 30s).",
            };
        case "rejected":
            return {
                dot: "bg-rose-500",
                headline: "Tunnel rejected",
                detail:
                    closeHint ||
                    "The backend refused this node — re-provision it from the dashboard.",
            };
        case "provisioning-required":
            return {
                dot: "bg-slate-500",
                headline: "Not set up",
                detail: "Enable this machine as your self-hosted node below.",
            };
        case "stopped":
        default:
            return {
                dot: "bg-slate-500",
                headline: "Node stopped",
                detail: "Start the node to connect the tunnel and serve self-hosted sessions.",
            };
    }
}

export function NodeRuntimeView() {
    const { info, loading, busy, error, start, stop, refresh } = useNodeRuntime();
    const prov = useProvisioning(() => void refresh());
    const [browser, setBrowser] = useState<BrowserInfo | null>(null);

    const loadBrowser = useCallback(async () => {
        try {
            const res = await window.prxApi.nodeRuntime.getBrowser();
            if (res.data) setBrowser(res.data);
        } catch {
            /* availability is best-effort */
        }
    }, []);

    useEffect(() => {
        void loadBrowser();
    }, [loadBrowser]);

    const chooseBrowser = useCallback(
        async (choice: "auto" | "system" | "managed") => {
            const res = await window.prxApi.nodeRuntime.setBrowser(choice);
            if (res.data) setBrowser(res.data);
        },
        [],
    );

    const p = presentStatus(
        info?.state ?? "provisioning-required",
        info?.lastCloseHint ?? null,
        info?.activeSessions ?? 0,
    );
    const lifecycleActive =
        info?.state === "online" || info?.state === "connecting" || info?.state === "reconnecting";

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <header className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-slate-300" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-slate-100">Self-Hosted Node</h1>
                    <p className="text-sm text-slate-400">
                        Your machine's Chrome serves your self-hosted auth sessions — built into
                        this app, no separate node software.
                    </p>
                </div>
            </header>

            {loading ? (
                <div className="text-slate-400 text-sm">Checking node state…</div>
            ) : (
                <>
                    {/* Onboarding: not provisioned yet → one-click enable */}
                    {prov.provisioned === false && (
                        <section className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
                            <p className="text-slate-100 font-medium">
                                Enable this machine as your self-hosted node
                            </p>
                            <p className="text-sm text-slate-400">
                                One click registers a node with your account and connects the
                                tunnel. No keys to copy, no files to edit.
                            </p>
                            <button
                                onClick={() => void prov.enable()}
                                disabled={prov.busy}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                            >
                                <Play className="w-4 h-4" />
                                {prov.busy ? "Enabling…" : "Enable Self-Hosted Node"}
                            </button>
                            {prov.failureKind === "license-required" && (
                                <p className="text-sm text-amber-300">
                                    Self-Hosted license required — purchase it in the Marketplace,
                                    then come back here.
                                </p>
                            )}
                            {prov.failureKind === "limit-reached" && (
                                <p className="text-sm text-amber-300">
                                    Node limit reached — revoke an existing node in the dashboard
                                    first, then retry.
                                </p>
                            )}
                            {prov.error && prov.failureKind === null && (
                                <p className="text-sm text-rose-300">{prov.error}</p>
                            )}
                        </section>
                    )}

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
                                {lifecycleActive ? (
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

                        {info?.lastCloseHint && info.state !== "rejected" && (
                            <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                                {info.lastCloseHint}
                            </p>
                        )}
                    </section>

                    <section className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-4">
                        <div className="flex items-center gap-3">
                            <Globe className="w-4 h-4 text-slate-400" />
                            <div>
                                <p className="text-slate-100 font-medium">Session browser</p>
                                <p className="text-sm text-slate-400">
                                    Which Chrome self-hosted sessions open in. Applies to the next session.
                                </p>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <BrowserOption
                                label="Automatic (recommended)"
                                hint={
                                    browser?.resolved
                                        ? `Currently using: ${browser.resolved.kind === "system" ? "installed Google Chrome" : "app-managed browser"}`
                                        : "No browser available"
                                }
                                available={!!browser?.resolved}
                                active={browser?.choice === "auto"}
                                onClick={() => void chooseBrowser("auto")}
                            />
                            <BrowserOption
                                label="Installed Google Chrome"
                                hint={
                                    browser?.system
                                        ? "Detected — best sign-in fidelity"
                                        : "Not detected on this machine"
                                }
                                available={!!browser?.system}
                                active={browser?.choice === "system"}
                                onClick={() => void chooseBrowser("system")}
                            />
                            <BrowserOption
                                label="App-managed browser"
                                hint={
                                    browser?.managed
                                        ? "Bundled Chromium from the Browser section"
                                        : "Not installed — see the Browser section"
                                }
                                available={!!browser?.managed}
                                active={browser?.choice === "managed"}
                                onClick={() => void chooseBrowser("managed")}
                            />
                        </div>
                        {browser?.resolved && (
                            <p className="text-xs text-slate-500 font-mono truncate" title={browser.resolved.path}>
                                {browser.resolved.path}
                            </p>
                        )}
                    </section>

                    <section className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
                        <Row label="State" value={info?.state ?? "—"} />
                        <Row label="Active sessions" value={String(info?.activeSessions ?? 0)} />
                        <Row label="Sessions served" value={String(info?.totalSessions ?? 0)} />
                        <Row label="Reconnect attempts" value={String(info?.reconnectCount ?? 0)} />
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

function BrowserOption({
    label,
    hint,
    available,
    active,
    onClick,
}: {
    label: string;
    hint: string;
    available: boolean;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={!available}
            className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                active
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/5"
            } ${!available ? "opacity-40 cursor-not-allowed" : ""}`}
        >
            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-200 font-medium">{label}</span>
                {active && <span className="text-xs text-primary">Selected</span>}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{hint}</p>
        </button>
    );
}