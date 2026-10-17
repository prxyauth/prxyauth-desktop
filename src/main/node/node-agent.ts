/**
 * Node agent — the embedded self-hosted node, running NATIVELY in the
 * desktop app's main process. No child process, no payload, no second
 * app: the desktop IS the node.
 *
 * Replaces the NodeRuntimeService (which spawned the prxyauth-selfhosted
 * bytecode payload — killed by three version locks: sqlite ABI, V8
 * bytecode, and Node engine; the selfhosted bundle requires Node 20+
 * while the desktop's Electron embeds Node 18).
 *
 * The agent speaks the exact wire protocol the backend already serves
 * (be-prxyauth /ws/selfhosted), ported from the proven selfhosted
 * implementation:
 *  - auth-first-frame, 30s heartbeat, backoff reconnect
 *  - close-code semantics: 4001 infra → backoff; 4005 license → backoff
 *    (billing self-heals on renewal); 4003 bad key → 3 bounded retries,
 *    then stay down; 4002/4004 → stay down
 *  - launch/terminate session choreography; fresh Chrome per launch
 *  - CDP relay with text-frame + open-race-buffer rules
 *
 * State lives in <userData>/node-agent.json (nodeKey, backendUrl) — no
 * .env, no SQLite.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { app } from "electron";
import log from "electron-log";
import WebSocket from "ws";
import type { TunnelMessage } from "./tunnel-types";
import { CdpRelay } from "./cdp-relay";
import {
    AGENT_VERSION,
    browserAvailability,
    closeRemoteBrowser,
    launchChromeRemote,
    tryResolveChromeExecutable,
    type BrowserChoice,
    type RemoteBrowser,
} from "./chrome-launcher";
import { ensureProfileDir } from "./profile-dirs";

// ── constants (mirror the selfhosted client exactly) ───────────────────
const CONNECT_TIMEOUT_MS = 15_000;
const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const INVALID_KEY_MAX_RETRIES = 3;
const HEARTBEAT_INTERVAL_MS = 30_000;

export type NodeAgentState =
    | "provisioning-required" // no node-agent.json → onboarding needed
    | "stopped" // user-stopped; will not retry
    | "connecting" // WS lifecycle mid-flight
    | "online" // backend acked our nodeKey
    | "reconnecting" // lost connection; backoff timer armed
    | "rejected"; // 4003 exhausted / 4002 / 4004 — needs operator action

export interface NodeAgentStatus {
    state: NodeAgentState;
    /** Human-facing close-code hint, e.g. "4005 — self-hosted license required". */
    lastCloseHint: string | null;
    /** Active bridged sessions (Chrome up + relay conns open). */
    activeSessions: number;
    /** Total sessions served since agent start. */
    totalSessions: number;
    /** Reconnect attempts since last online. */
    reconnectCount: number;
}

/** Persisted agent config — written by provisioning (one-time nodeKey). */
interface AgentConfig {
    nodeKey: string;
    /** Backend base URL (https://api.example.com) — tunnel derives from it. */
    backendUrl: string;
    nodeName: string;
    provisionedAt: string;
    /** Which executable self-hosted sessions launch (auto | system | managed). */
    browserChoice?: BrowserChoice;
}

export function agentConfigPath(): string {
    return path.join(app.getPath("userData"), "node-agent.json");
}

export function readAgentConfig(): AgentConfig | null {
    try {
        if (!existsSync(agentConfigPath())) return null;
        const raw = JSON.parse(readFileSync(agentConfigPath(), "utf-8")) as AgentConfig;
        if (!raw?.nodeKey || !raw?.backendUrl) return null;
        return raw;
    } catch {
        return null;
    }
}

/** The native agent is always "installed" — no payload to check for. */
export function isNodeAgentAvailable(): boolean {
    return true;
}

function tunnelUrlFrom(backendUrl: string): string {
    return backendUrl.replace(/^http/, "ws") + "/ws/selfhosted";
}

/** Per-session state between `launch` and `terminate`. */
interface AgentSession {
    browser: RemoteBrowser;
}

export class NodeAgent {
    private ws: WebSocket | null = null;
    private relay: CdpRelay | null = null;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private stopped = true;
    private backoffMs = MIN_BACKOFF_MS;
    private invalidKeyRetries = 0;
    private authenticated = false;
    private sessions = new Map<string, AgentSession>();
    private lastCloseHint: string | null = null;
    private reconnectCount = 0;
    private totalSessions = 0;

    private config: AgentConfig | null = null;

    /** Start the agent (connect the tunnel). Returns an error string when
     *  the agent is not provisioned — the renderer offers onboarding. */
    start(): { started: boolean; error?: string } {
        if (!this.stopped) return { started: true };
        this.config = readAgentConfig();
        if (!this.config) {
            return {
                started: false,
                error: "Node not provisioned — enable the self-hosted node first.",
            };
        }
        this.stopped = false;
        this.backoffMs = MIN_BACKOFF_MS;
        this.invalidKeyRetries = 0;
        this.relay = new CdpRelay(
            (msg) => this.send(msg),
            (level, message) => (level === "warn" ? log.warn : log.info)(`[NodeAgent] ${message}`),
        );
        log.info("[NodeAgent] starting — connecting to prxyauth tunnel");
        this.connect();
        return { started: true };
    }

    async stop(): Promise<void> {
        this.stopped = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.stopHeartbeat();
        this.relay?.closeAll();
        // Close every session's Chrome so profiles flush to disk.
        for (const [id, session] of [...this.sessions.entries()]) {
            this.sessions.delete(id);
            await closeRemoteBrowser(session.browser).catch((err) =>
                log.error(`[NodeAgent] close session ${id} failed:`, err),
            );
        }
        try {
            this.ws?.close(1000, "Node stopping");
        } catch {
            /* already closed */
        }
        this.ws = null;
        log.info("[NodeAgent] stopped");
    }

    getStatus(): NodeAgentStatus {
        let state: NodeAgentState;
        if (this.stopped) {
            state = readAgentConfig() ? "stopped" : "provisioning-required";
        } else if (this.authenticated) {
            state = "online";
        } else if (this.reconnectTimer) {
            state = "reconnecting";
        } else {
            state = "connecting";
        }
        // A stay-down rejection overrides the lifecycle states.
        if (this.lastCloseHint?.startsWith("4003")) state = "rejected";
        else if (this.lastCloseHint?.startsWith("4002")) state = "rejected";
        else if (this.lastCloseHint?.startsWith("4004")) state = "rejected";
        return {
            state,
            lastCloseHint: this.lastCloseHint,
            activeSessions: this.sessions.size,
            totalSessions: this.totalSessions,
            reconnectCount: this.reconnectCount,
        };
    }

    /** Write-through after provisioning so a running agent picks up the
     *  new key without an app restart. */
    applyNewConfig(): boolean {
        this.config = readAgentConfig();
        return this.config !== null;
    }

    // ── connection lifecycle ─────────────────────────────────────────

    private connect(): void {
        if (!this.config) return;
        const url = tunnelUrlFrom(this.config.backendUrl);
        log.info(`[NodeAgent] connecting to ${url}`);
        const ws = new WebSocket(url, { handshakeTimeout: CONNECT_TIMEOUT_MS });
        this.ws = ws;

        const failTimer = setTimeout(() => {
            ws.terminate();
            this.scheduleReconnect("connect timeout");
        }, CONNECT_TIMEOUT_MS);

        ws.once("open", () => {
            clearTimeout(failTimer);
            this.backoffMs = MIN_BACKOFF_MS;
            // First frame MUST be auth — the backend rejects anything else.
            this.send({
                type: "auth",
                payload: { nodeKey: this.config!.nodeKey, agentVersion: AGENT_VERSION },
            });
            this.startHeartbeat();
        });

        ws.on("message", (raw) => this.handleMessage(raw));
        ws.on("close", (code, reason) => this.handleClose(code, reason));
        ws.on("error", (err) => log.warn(`[NodeAgent] tunnel socket error: ${err.message}`));
    }

    private handleClose(code: number, reason: Buffer): void {
        this.stopHeartbeat();
        this.authenticated = false;
        if (this.stopped) return;
        // 4001 = backend infra failure during auth (DB restarting, pool not
        // ready). The key is fine — reconnect with normal backoff.
        if (code === 4001) {
            this.scheduleReconnect(`backend temporarily unavailable (code ${code})`);
            return;
        }
        // 4005 = no SELFHOSTED license (expired or never purchased). The key
        // itself is fine — billing state, not a credential problem. Keep
        // retrying with backoff so a checkout/renewal self-heals the tunnel
        // WITHOUT restarting the app.
        if (code === 4005) {
            this.lastCloseHint = "4005 — self-hosted license required (renew to reconnect)";
            this.scheduleReconnect(`selfhosted license required (code ${code})`);
            return;
        }
        // 4003 = invalid node key. Usually permanent (revoked/rotated key) but
        // a transient rejection is possible while the backend itself is
        // mid-restart: retry a bounded number of times before declaring the
        // key dead, so a valid node recovers on its own.
        if (code === 4003) {
            this.invalidKeyRetries += 1;
            if (this.invalidKeyRetries <= INVALID_KEY_MAX_RETRIES) {
                this.lastCloseHint = null;
                this.scheduleReconnect(`invalid node key (code ${code})`);
                return;
            }
            this.lastCloseHint =
                "4003 — node key consistently invalid. Revoke and re-provision this node.";
            log.error("[NodeAgent] node key consistently invalid — staying down");
            this.stopped = true;
            return;
        }
        if (code >= 4000 && code < 5000) {
            this.lastCloseHint = `${code} — tunnel rejected by the backend`;
            log.error(`[NodeAgent] tunnel rejected (code ${code}): ${reason.toString()}`);
            this.stopped = true;
            return;
        }
        this.scheduleReconnect(`tunnel closed (code ${code})`);
    }

    private scheduleReconnect(reason: string): void {
        if (this.stopped || this.reconnectTimer) return;
        this.reconnectCount += 1;
        const delay = this.backoffMs;
        this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
        log.warn(`[NodeAgent] reconnecting (${reason}), delay ${delay}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }

    private startHeartbeat(): void {
        this.stopHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.send({ type: "heartbeat" });
        }, HEARTBEAT_INTERVAL_MS);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    private send(msg: TunnelMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        }
    }

    // ── protocol handling ────────────────────────────────────────────

    private handleMessage(raw: unknown): void {
        const text =
            typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf-8") : null;
        if (!text) return;
        let msg: TunnelMessage;
        try {
            msg = JSON.parse(text) as TunnelMessage;
        } catch {
            log.warn("[NodeAgent] malformed tunnel message from backend, ignoring");
            return;
        }
        if (!msg || typeof msg.type !== "string") return;

        switch (msg.type) {
            case "error":
                // The backend acks auth with { code: 'authenticated' } —
                // that is a success signal, not an error.
                if (msg.payload?.code === "authenticated") {
                    this.authenticated = true;
                    this.invalidKeyRetries = 0;
                    this.reconnectCount = 0;
                    this.lastCloseHint = null;
                    log.info("[NodeAgent] tunnel authenticated — node is ONLINE");
                } else {
                    log.warn(
                        `[NodeAgent] backend tunnel error: ${msg.payload?.code} ${msg.payload?.message}`,
                    );
                }
                return;
            case "launch":
                void this.handleLaunch(msg.payload);
                return;
            case "cdp-open":
                this.relay?.open(msg.payload.sessionId, msg.payload.connId, msg.payload.nodeCdpUrl);
                return;
            case "cdp":
                this.relay?.handleServerCdp(
                    msg.payload.sessionId,
                    msg.payload.connId,
                    msg.payload.data,
                );
                return;
            case "cdp-close":
                this.relay?.closeConn(msg.payload.sessionId, msg.payload.connId);
                return;
            case "terminate":
                void this.handleTerminate(msg.payload.sessionId);
                return;
            default:
                log.debug(`[NodeAgent] unhandled tunnel message type: ${(msg as { type: string }).type}`);
        }
    }

    private async handleLaunch(payload: {
        sessionId: string;
        email: string;
        profileDir: string;
        debugPort: number;
        proxy?: { server: string; username?: string; password?: string };
    }): Promise<void> {
        const { sessionId, email, profileDir, proxy } = payload;
        try {
            if (proxy) {
                log.warn(
                    `[NodeAgent] backend requested a proxy (${proxy.server}) — desktop agent does not apply proxies yet; launching without one`,
                );
            }
            // Fresh instance per launch: close any prior Chrome for this
            // profile — after a prior Playwright session detaches, Chrome's
            // browser-level CDP endpoint can be left degraded (hard 30s
            // connectOverCDP timeout on every retry after the first login).
            const prior = this.sessions.get(sessionId);
            if (prior) {
                this.sessions.delete(sessionId);
                await closeRemoteBrowser(prior.browser).catch(() => {});
            }
            const dir = ensureProfileDir(profileDir || email);
            const browser = await launchChromeRemote(dir, profileDir || email, this.config?.browserChoice ?? "auto");
            this.sessions.set(sessionId, { browser });
            this.totalSessions += 1;
            // Browser-level CDP URL incl. UUID (captured at launch from
            // /json/version) — Chrome rejects handshakes to any other path.
            this.send({
                type: "cdp-ready",
                payload: { sessionId, nodeCdpUrl: browser.browserWsUrl },
            });
            log.info(
                `[NodeAgent] Chrome launched for backend session ${sessionId} (port ${browser.debugPort})`,
            );
        } catch (err) {
            // The protocol has no node→server error frame; the backend's
            // 30s launch timeout fails the session. Log loudly.
            log.error(`[NodeAgent] failed to launch Chrome for session ${sessionId}:`, err);
        }
    }

    private async handleTerminate(sessionId: string): Promise<void> {
        if (sessionId === "*") {
            // Backend shutdown broadcast — terminate every session we hold.
            for (const id of [...this.sessions.keys()]) {
                await this.handleTerminate(id);
            }
            return;
        }
        this.relay?.terminateSession(sessionId);
        const session = this.sessions.get(sessionId);
        if (!session) return;
        this.sessions.delete(sessionId);
        try {
            await closeRemoteBrowser(session.browser);
            log.info(`[NodeAgent] session ${sessionId} terminated — Chrome closed, profile flushed`);
        } catch (err) {
            log.error(`[NodeAgent] failed to close Chrome after terminate:`, err);
        }
    }
}

// ── wiring ─────────────────────────────────────────────────────────────
let _agent: NodeAgent | null = null;

export function getNodeAgent(): NodeAgent {
    if (!_agent) _agent = new NodeAgent();
    return _agent;
}

/**
 * Persist agent config (called by provisioning). Never store the nodeKey
 * anywhere else; the renderer never sees key material.
 */
export function writeAgentConfig(config: Omit<AgentConfig, "provisionedAt">): void {
    const full: AgentConfig = { ...config, provisionedAt: new Date().toISOString() };
    writeFileSync(agentConfigPath(), JSON.stringify(full, null, 2), { encoding: "utf-8" });
}

/** Current browser choice from the persisted config (default "auto"). */
export function getBrowserChoice(): BrowserChoice {
    return readAgentConfig()?.browserChoice ?? readPendingBrowserChoice();
}

/** Persist a new browser choice; a running agent picks it up on next launch.
 *  Works pre-provisioning too — the preference is stored standalone and
 *  provisioning merges it into the agent config. */
export function setBrowserChoice(choice: BrowserChoice): { success: boolean; error?: string } {
    const existing = readAgentConfig();
    if (existing) {
        writeAgentConfig({
            nodeKey: existing.nodeKey,
            backendUrl: existing.backendUrl,
            nodeName: existing.nodeName,
            browserChoice: choice,
        });
        getNodeAgent().applyNewConfig();
        return { success: true };
    }
    // Not provisioned yet — persist the preference standalone.
    try {
        writeFileSync(pendingBrowserChoicePath(), JSON.stringify({ browserChoice: choice }), {
            encoding: "utf-8",
        });
        return { success: true };
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

/** Standalone preference file used when the node is not provisioned yet. */
function pendingBrowserChoicePath(): string {
    return path.join(app.getPath("userData"), "node-browser-choice.json");
}

function readPendingBrowserChoice(): BrowserChoice {
    try {
        if (!existsSync(pendingBrowserChoicePath())) return "auto";
        const raw = JSON.parse(readFileSync(pendingBrowserChoicePath(), "utf-8")) as {
            browserChoice?: BrowserChoice;
        };
        return raw.browserChoice ?? "auto";
    } catch {
        return "auto";
    }
}

/** Browser availability for the settings UI (no key material). */
export function getBrowserAvailability(): {
    system: string | null;
    managed: string | null;
    choice: BrowserChoice;
    resolved: { path: string; kind: "system" | "managed" } | null;
} {
    const choice = getBrowserChoice();
    return {
        ...browserAvailability(),
        choice,
        resolved: tryResolveChromeExecutable(choice),
    };
}