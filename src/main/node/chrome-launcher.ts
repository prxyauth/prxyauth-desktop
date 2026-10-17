/**
 * Remote-mode Chrome launcher for the embedded node agent.
 *
 * In remote mode the control plane (be-prxyauth) drives the browser over
 * the WS-CDP tunnel, so this node must NOT hold a Playwright connection —
 * Chrome's browser-level CDP endpoint allows only ONE active connection;
 * the backend's connectOverCDP (relayed through the tunnel) owns it.
 *
 * Ported from prxyauth-selfhosted chrome-launcher.service.ts (remote path),
 * with the executable resolved via the desktop's BrowserManager so the
 * same Chromium the app already manages is reused.
 */

import { ChildProcess, spawn } from "child_process";
import net from "net";
import { existsSync } from "fs";
import path from "path";
import log from "electron-log";
import { BrowserManager } from "../browser-manager";

/** Agent identity reported at auth (surfaced in the backend's node list). */
export const AGENT_VERSION = "prxyauth-desktop/2.0.0";

export interface RemoteBrowser {
    profileName: string;
    profileDir: string;
    debugPort: number;
    chromeProcess: ChildProcess;
    chromePid: number;
    /** Browser-level CDP ws URL — captured at launch for graceful close. */
    browserWsUrl: string;
}

function findAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on("error", reject);
        server.listen(0, "127.0.0.1", () => {
            const port = (server.address() as net.AddressInfo).port;
            server.close(() => resolve(port));
        });
    });
}

/**
 * Chrome args for spawn(). Uses --remote-debugging-port (TCP) so the CDP
 * relay can bridge; --remote-debugging-pipe would be detected by Google as
 * automation. The debug port is bound to 127.0.0.1 so the CDP endpoint is
 * never exposed to the LAN — an exposed port would let any local network
 * client attach and read the profile's authenticated cookies/session.
 */
function buildChromeArgs(debugPort: number, profileDir: string): string[] {
    return [
        `--user-data-dir=${profileDir}`,
        `--remote-debugging-port=${debugPort}`,
        "--remote-debugging-address=127.0.0.1",
        // Anti-detection: no automation infobar, no blink AutomationControlled.
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--disable-extensions",
        "--disable-default-apps",
        // Stability: no first-run prompts, no background throttling, and the
        // singleton merge must never happen (each profile has its own port).
        "--no-first-run",
        "--no-default-browser-check",
        "--new-window",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-hang-monitor",
        "--disable-prompt-on-repost",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-features=CalculateNativeWinOcclusion,IsolateOrigins,site-per-process",
    ];
}

/** Waits for Chrome's CDP endpoint by polling /json/version. */
async function waitForCDP(
    debugPort: number,
    timeoutMs = 15_000,
): Promise<string> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`, {
                signal: AbortSignal.timeout(2_000),
            });
            if (res.ok) {
                const data = (await res.json()) as { webSocketDebuggerUrl?: string };
                if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
            }
        } catch {
            /* Chrome not ready yet */
        }
        await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`Chrome CDP endpoint not ready on port ${debugPort} after ${timeoutMs}ms`);
}

/** Resolves the Chromium executable — the app's managed install first,
 *  real Chrome candidates as fallback (selfhosted parity). */
function resolveChromeExecutable(): string {
    const managed = BrowserManager.getInstance().getExecutablePath();
    if (managed && existsSync(managed)) return managed;

    const candidates: string[] = [];
    if (process.platform === "win32") {
        candidates.push(
            path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
            path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
            path.join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
        );
    } else if (process.platform === "darwin") {
        candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    } else {
        candidates.push("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser");
    }
    for (const c of candidates) {
        if (c && existsSync(c)) return c;
    }
    throw new Error(
        "No Chrome/Chromium executable found — install the browser from the app's Browser section first.",
    );
}

/**
 * Launches Chrome for REMOTE automation WITHOUT holding a Playwright
 * connection (see file doc). Spawns with the debug port, waits for CDP
 * readiness, and returns the browser handle.
 *
 * FRESH instance per launch — reusing a prior Chrome after Playwright
 * detaches leaves the browser-level CDP endpoint in a degraded state
 * where a new connectOverCDP handshake times out (proven failure mode).
 */
export async function launchChromeRemote(profileDir: string, profileName: string): Promise<RemoteBrowser> {
    const debugPort = await findAvailablePort();
    const chromePath = resolveChromeExecutable();
    const args = buildChromeArgs(debugPort, profileDir);

    log.info(
        `[NodeAgent] launching Chrome for remote automation (profile=${profileName} port=${debugPort})`,
    );

    const chromeProcess = spawn(chromePath, args, {
        stdio: "ignore",
        detached: false,
    });

    try {
        const browserWsUrl = await waitForCDP(debugPort);
        log.info(`[NodeAgent] Chrome CDP endpoint ready (port=${debugPort})`);
        return {
            profileName,
            profileDir,
            debugPort,
            chromeProcess,
            chromePid: chromeProcess.pid as number,
            browserWsUrl,
        };
    } catch (err) {
        log.error("[NodeAgent] remote Chrome launch failed:", err);
        await killProcessTree(chromeProcess.pid).catch(() => {});
        throw err;
    }
}

/**
 * Graceful close — sends CDP `Browser.close` so Chrome flushes the profile
 * (cookies/session DB) to disk before exiting. A hard kill (TerminateProcess
 * / taskkill /F) skips the flush and can leave a freshly-logged-in profile
 * signed out on next launch.
 *
 * CRITICAL: the WebSocket MUST target the browser-level endpoint from
 * /json/version — Chrome rejects handshakes to any other path.
 */
export async function closeChromeGracefully(browser: RemoteBrowser): Promise<boolean> {
    let WebSocket: typeof import("ws");
    try {
        WebSocket = (await import("ws")).default ?? (await import("ws"));
    } catch {
        return false;
    }

    return new Promise<boolean>((resolve) => {
        let settled = false;
        let opened = false;
        let sent = false;

        const finish = (ok: boolean) => {
            if (settled) return;
            settled = true;
            try {
                if (opened) ws.close(1000, "graceful-close");
            } catch {
                /* already closed */
            }
            resolve(ok);
        };

        const ws = new WebSocket(browser.browserWsUrl, { handshakeTimeout: 3_000 });

        ws.on("open", () => {
            opened = true;
            try {
                ws.send(JSON.stringify({ id: 1, method: "Browser.close", params: {} }));
                sent = true;
                setTimeout(() => finish(true), 1_500);
            } catch {
                finish(false);
            }
        });
        ws.on("message", (data) => {
            try {
                const msg = JSON.parse(String(data));
                if (msg && msg.id === 1) finish(true);
            } catch {
                /* not JSON */
            }
        });
        ws.on("error", () => finish(opened && sent));
        ws.on("close", () => finish(opened && sent));
        setTimeout(() => finish(opened && sent), 5_000);
    });
}

/** Kill the FULL process tree, not just the root — Chrome's renderers/gpu
 *  children hold the profile dir and CDP port; a root-only kill orphans
 *  them (stale lock + port stays bound). Windows: taskkill /T /F. */
export async function killProcessTree(pid: number | undefined): Promise<void> {
    if (!pid) return;
    if (process.platform === "win32") {
        const { exec } = await import("child_process");
        await new Promise<void>((resolve) => {
            exec(`taskkill /PID ${pid} /T /F`, () => resolve());
        });
        return;
    }
    try {
        process.kill(-pid, "SIGKILL");
    } catch {
        try {
            process.kill(pid, "SIGKILL");
        } catch {
            /* already gone */
        }
    }
}

/**
 * Closes a remote browser: graceful CDP Browser.close first, then a bounded
 * wait for exit, then tree-kill as the never-leak fallback. Returns once the
 * port + profile are actually released.
 */
export async function closeRemoteBrowser(browser: RemoteBrowser): Promise<void> {
    const delivered = await closeChromeGracefully(browser);
    const exited = await waitForExit(browser.chromeProcess, 10_000);
    if (!exited) {
        log.warn(`[NodeAgent] Chrome pid=${browser.chromePid} did not exit gracefully — tree-killing`);
        await killProcessTree(browser.chromePid);
    } else {
        log.info(`[NodeAgent] Chrome exited gracefully (close delivered=${delivered})`);
    }
    await waitForPortFree(browser.debugPort, 5_000);
}

async function waitForExit(proc: ChildProcess, timeoutMs: number): Promise<boolean> {
    if (proc.exitCode !== null) return true;
    return new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), timeoutMs);
        proc.once("exit", () => {
            clearTimeout(t);
            resolve(true);
        });
    });
}

async function waitForPortFree(port: number, timeoutMs: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const free = await new Promise<boolean>((resolve) => {
            const probe = net.connect({ port, host: "127.0.0.1" });
            probe.on("error", () => resolve(true));
            probe.on("connect", () => {
                probe.destroy();
                resolve(false);
            });
        });
        if (free) return;
        await new Promise((r) => setTimeout(r, 250));
    }
    log.warn(`[NodeAgent] port ${port} still bound after wait — continuing`);
}