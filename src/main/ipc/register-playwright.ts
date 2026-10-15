/**
 * Playwright IPC surface — thin channel handlers.
 *
 * Each handler validates its payload and delegates to the session
 * launcher / browser store services. No business logic lives here
 * (separation of concerns: transport vs. behavior).
 */

import { ipcMain } from "electron";
import {
    allConnections,
    emitBrowserClosed,
    getConnection,
    sessionStatuses,
} from "../services/browser-store";
import { cleanupProxyBridge } from "../services/proxy-bridge";
import {
    connectRemote,
    launchLocal,
    showPortal,
    terminateBrowser,
    type FingerprintInput,
    type SessionInfoInput,
} from "../services/session-launcher";
import type { ProxyInput } from "../services/proxy-bridge";

/** Wrap a handler with the standard { success, error } envelope. */
function handled<T extends Record<string, unknown>>(
    fn: (payload: T) => Promise<Record<string, unknown> | void>,
): (event: Electron.IpcMainInvokeEvent, payload: T) => Promise<Record<string, unknown>> {
    return async (_event, payload) => {
        try {
            return (await fn(payload ?? ({} as T))) ?? { success: true };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Operation failed",
            };
        }
    };
}

export function registerPlaywrightIpc(): void {
    ipcMain.handle(
        "playwright:connect",
        handled<{ wsEndpoint: string; sessionId: string; fingerprint?: FingerprintInput }>(
            async ({ wsEndpoint, sessionId, fingerprint }) =>
                connectRemote(wsEndpoint, sessionId, fingerprint),
        ),
    );

    ipcMain.handle(
        "playwright:navigate",
        handled<{ sessionId: string; url: string }>(async ({ sessionId, url }) => {
            const connection = getConnection(sessionId);
            if (!connection) {
                return { success: false, error: "No active connection for this session" };
            }
            await connection.page.goto(url, { waitUntil: "domcontentloaded" });
            return { success: true, currentUrl: connection.page.url() };
        }),
    );

    ipcMain.handle(
        "playwright:getPageInfo",
        handled<{ sessionId: string }>(async ({ sessionId }) => {
            const connection = getConnection(sessionId);
            if (!connection) {
                return { success: false, error: "No active connection for this session" };
            }
            const url = connection.page.url();
            const title = await connection.page.title();
            return { success: true, url, title };
        }),
    );

    ipcMain.handle(
        "playwright:screenshot",
        handled<{ sessionId: string }>(async ({ sessionId }) => {
            const connection = getConnection(sessionId);
            if (!connection) {
                return { success: false, error: "No active connection for this session" };
            }
            const buffer = await connection.page.screenshot({ type: "png" });
            const base64 = buffer.toString("base64");
            return { success: true, screenshot: `data:image/png;base64,${base64}` };
        }),
    );

    ipcMain.handle(
        "playwright:closeLocal",
        handled<{ sessionId: string }>(async ({ sessionId }) => {
            const success = await terminateBrowser(sessionId);
            return {
                success: true,
                message: success ? "Browser closed successfully" : "Browser already closed",
            };
        }),
    );

    ipcMain.handle(
        "playwright:disconnect",
        handled<{ sessionId: string }>(async ({ sessionId }) => {
            const success = await terminateBrowser(sessionId);
            if (!success) {
                return { success: false, error: "No active connection for this session" };
            }
            return { success: true, message: "Disconnected successfully" };
        }),
    );

    ipcMain.handle(
        "playwright:launchLocal",
        handled<{
            sessionId: string;
            storageState?: string;
            proxy?: ProxyInput;
            fingerprint?: FingerprintInput;
            session?: SessionInfoInput;
            frontendUrl?: string;
        }>(async (payload) => launchLocal(payload)),
    );

    ipcMain.handle(
        "playwright:showPortal",
        handled<{
            sessionId: string;
            fingerprint?: FingerprintInput;
            session?: SessionInfoInput;
            proxy?: ProxyInput;
            frontendUrl?: string;
        }>(async ({ sessionId, frontendUrl }) => showPortal(sessionId, frontendUrl)),
    );

    ipcMain.handle(
        "playwright:bringToFront",
        handled<{ sessionId: string }>(async ({ sessionId }) => {
            const connection = getConnection(sessionId);
            if (!connection) {
                return { success: false, error: "No active connection for this session" };
            }
            await connection.page.bringToFront();
            return { success: true };
        }),
    );

    ipcMain.handle("playwright:listConnections", async () => {
        // Validate liveness of all tracked browsers
        const liveSessions: string[] = [];
        const deadSessions: string[] = [];

        for (const [sessionId, connection] of allConnections()) {
            try {
                if (connection.browser.isConnected()) {
                    liveSessions.push(sessionId);
                } else {
                    deadSessions.push(sessionId);
                }
            } catch {
                deadSessions.push(sessionId);
            }
        }

        // Clean up stale entries discovered during heartbeat
        for (const sessionId of deadSessions) {
            console.log(`[Main] Heartbeat cleanup: stale browser for session ${sessionId}`);
            emitBrowserClosed(sessionId);
            await cleanupProxyBridge(sessionId);
        }

        return {
            success: true,
            sessions: liveSessions,
            statuses: sessionStatuses(),
        };
    });
}