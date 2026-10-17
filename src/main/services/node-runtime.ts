/**
 * Node runtime service — manages the embedded self-hosted node server
 * as a child process of the desktop app.
 *
 * Phase 1 of the desktop/selfhosted consolidation: the node server
 * (built by prxyauth-selfhosted, bytecode-protected) runs inside the
 * desktop app so a customer installs ONE program. The server keeps its
 * own identity: its own .env (NODE_KEY etc.), its own SQLite DB, its
 * own port. This service only owns process lifecycle: spawn, health
 * check, restart-on-crash, graceful stop.
 *
 * Spawn mechanism: ELECTRON_RUN_AS_NODE=1 under the app's own binary —
 * the packaged node payload is built for Electron's ABI (see
 * rebuild-native-for-electron.mjs in prxyauth-selfhosted), so no
 * system Node is required on the customer machine.
 */

import { ChildProcess, spawn } from "child_process";
import { accessSync, constants } from "fs";
import path from "path";
import { app } from "electron";

export type NodeRuntimeStatus =
    | "not-installed" // payload missing
    | "stopped"
    | "starting"
    | "running"
    | "crashed";

export interface NodeRuntimeInfo {
    status: NodeRuntimeStatus;
    pid?: number;
    port: number;
    lastExitCode?: number | null;
    lastCrashAt?: string | null;
    restartCount: number;
}

/** Where the built node payload lives inside the packaged app. */
function payloadDir(): string {
    // dev: <desktop-repo>/node-runtime/ ; packaged: resources/node-runtime/
    const base = app.isPackaged
        ? process.resourcesPath
        : path.resolve(app.getAppPath(), "node-runtime");
    return path.join(base, "node-runtime");
}

/** The payload ships as bytenode bytecode — the loader is required. */
function payloadEntry(): string {
    return path.join(payloadDir(), "dist", "index.jsc");
}

function bytenodeLoader(): string {
    // payload ships its own node_modules (bytenode + externals) so the
    // bytecode can resolve them; same layout dev and packaged.
    return path.join(payloadDir(), "node_modules", "bytenode", "lib", "index.js");
}

export function isNodeRuntimeInstalled(): boolean {
    try {
        accessSync(payloadEntry(), constants.R_OK);
        accessSync(bytenodeLoader(), constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

const RESTART_DELAYS_MS = [1_000, 5_000, 15_000, 60_000]; // bounded backoff
const HEALTH_TIMEOUT_MS = 30_000;
const HEALTH_INTERVAL_MS = 1_000;

export class NodeRuntimeService {
    private child: ChildProcess | null = null;
    private status: NodeRuntimeStatus = "stopped";
    private restartCount = 0;
    private lastExitCode: number | null = null;
    private lastCrashAt: string | null = null;
    private startGeneration = 0; // invalidated start attempts
    private stopRequested = false;
    private restartTimer: NodeJS.Timeout | null = null;

    constructor(private readonly port = 4000) {}

    /**
     * Resolve the .env path for the embedded node. Phase 1 keeps the
     * existing selfhosted data directory so an existing install's
     * profiles/DB migrate for free.
     */
    envFile(): string {
        return path.join(app.getPath("userData"), "node-runtime", ".env");
    }

    getInfo(): NodeRuntimeInfo {
        return {
            status: this.status,
            pid: this.child?.pid,
            port: this.port,
            lastExitCode: this.lastExitCode,
            lastCrashAt: this.lastCrashAt,
            restartCount: this.restartCount,
        };
    }

    /**
     * Start the node server. Resolves once the HTTP health endpoint
     * answers (the server binds its port BEFORE starting the tunnel, so
     * health-ok means tunnel attempt follows).
     */
    async start(): Promise<{ started: boolean; error?: string }> {
        if (this.child) {
            return { started: true };
        }
        if (!isNodeRuntimeInstalled()) {
            this.status = "not-installed";
            return { started: false, error: "Node runtime payload not installed" };
        }

        this.stopRequested = false;
        this.status = "starting";
        const generation = ++this.startGeneration;

        const env: Record<string, string> = {
            ...(process.env as Record<string, string>),
            ELECTRON_RUN_AS_NODE: "1",
            NODE_ENV: "production",
            PORT: String(this.port),
            HOST: "127.0.0.1",
        };

        // The node reads its own .env (NODE_KEY, TUNNEL_URL, ENCRYPTION_KEY...).
        // dotenv in the child resolves relative to its cwd, so point cwd at
        // the data dir where the .env lives.
        const dataDir = path.dirname(this.envFile());
        const args = ["-r", bytenodeLoader(), payloadEntry()];

        try {
            this.child = spawn(process.execPath, args, {
                cwd: dataDir,
                env,
                stdio: ["ignore", "pipe", "pipe"],
                windowsHide: true,
            });
        } catch (err) {
            this.status = "crashed";
            this.lastCrashAt = new Date().toISOString();
            return { started: false, error: `spawn failed: ${String(err)}` };
        }

        const child = this.child;

        child.stdout?.on("data", (d) => process.stdout.write(`[node] ${d}`));
        child.stderr?.on("data", (d) => process.stderr.write(`[node] ${d}`));

        child.on("error", (err) => {
            console.error("[NodeRuntime] process error:", err);
            if (this.child === child) {
                this.status = "crashed";
                this.lastCrashAt = new Date().toISOString();
                this.child = null;
            }
        });

        child.on("exit", (code, signal) => {
            this.lastExitCode = code;
            if (this.child === child) {
                this.child = null;
            }
            if (this.stopRequested) {
                this.status = "stopped";
                return;
            }
            this.status = "crashed";
            this.lastCrashAt = new Date().toISOString();
            this.restartCount += 1;
            const delay =
                RESTART_DELAYS_MS[
                    Math.min(this.restartCount - 1, RESTART_DELAYS_MS.length - 1)
                ];
            console.warn(
                `[NodeRuntime] exited (code=${code} signal=${signal}); restart #${this.restartCount} in ${delay}ms`,
            );
            this.restartTimer = setTimeout(() => {
                this.restartTimer = null;
                // a newer start()/stop() superseded this restart
                if (generation === this.startGeneration) {
                    void this.start();
                }
            }, delay);
        });

        const health = await this.waitForHealth(generation);
        if (!health.ok) {
            // leave status as-is (crashed/starting); restart loop owns recovery
            return { started: false, error: health.error };
        }
        if (this.status === "starting") this.status = "running";
        this.restartCount = 0;
        return { started: true };
    }

    /**
     * Graceful stop: SIGTERM-equivalent on Windows is taskkill of the tree;
     * the child listens for the window message in its shutdown handlers
     * (same contract as the selfhosted Electron shell used).
     */
    async stop(): Promise<void> {
        this.stopRequested = true;
        this.startGeneration += 1; // cancel any pending restart
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
            this.restartTimer = null;
        }
        const child = this.child;
        if (!child) {
            this.status = "stopped";
            return;
        }
        this.child = null;
        this.status = "stopped";
        await new Promise<void>((resolve) => {
            const t = setTimeout(() => {
                try {
                    child.kill("SIGKILL");
                } catch {
                    /* already gone */
                }
                resolve();
            }, 5_000);
            child.once("exit", () => {
                clearTimeout(t);
                resolve();
            });
            try {
                child.kill();
            } catch {
                clearTimeout(t);
                resolve();
            }
        });
    }

    private async waitForHealth(
        generation: number,
    ): Promise<{ ok: boolean; error?: string }> {
        const deadline = Date.now() + HEALTH_TIMEOUT_MS;
        while (Date.now() < deadline) {
            if (generation !== this.startGeneration || !this.child) {
                return { ok: false, error: "start superseded" };
            }
            try {
                const res = await fetch(`http://127.0.0.1:${this.port}/health`, {
                  signal: AbortSignal.timeout(1500),
                });
                if (res.ok) return { ok: true };
            } catch {
                /* not up yet */
            }
            await new Promise((r) => setTimeout(r, HEALTH_INTERVAL_MS));
        }
        return { ok: false, error: `health check timeout (${HEALTH_TIMEOUT_MS}ms)` };
    }
}

let instance: NodeRuntimeService | null = null;
export function getNodeRuntimeService(): NodeRuntimeService {
    if (!instance) instance = new NodeRuntimeService();
    return instance;
}