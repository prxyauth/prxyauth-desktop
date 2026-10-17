/**
 * Main process entry — bootstrap and composition ONLY.
 *
 * The layers (one concern per module):
 *   window.ts                     app window + web-contents policies
 *   ipc/register-playwright.ts    channel handlers (transport)
 *   ipc/register-node-runtime.ts  embedded node runtime channels (transport)
 *   services/session-launcher.ts  connect/launch/portal flows (behavior)
 *   services/browser-store.ts     connection + status state
 *   services/proxy-bridge.ts      authenticated proxy bridges
 *   services/fingerprint-injection.ts  stealth init script
 *   services/node-runtime.ts      embedded self-hosted node server lifecycle
 *   browser-manager.ts            Chromium install/executable resolution
 */

import { app, BrowserWindow } from "electron";
import "./env";
import { initAutoUpdater } from "./auto-updater";
import { BrowserManager } from "./browser-manager";
import { registerPlaywrightIpc } from "./ipc/register-playwright";
import { registerNodeRuntimeIpc } from "./ipc/register-node-runtime";
import { getNodeRuntimeService } from "./services/node-runtime";
import { allConnections } from "./services/browser-store";
import { createWindow, getMainWindow, installWebContentsPolicies } from "./window";

app.whenReady().then(async () => {
    const win = createWindow();

    // Register the IPC surface once, before any browser session starts.
    registerPlaywrightIpc();
    registerNodeRuntimeIpc();

    // Initialize auto-updater with window reference for progress display
    initAutoUpdater(win);

    // Harden every web contents created from now on (external links etc.)
    installWebContentsPolicies();

    // Initialize and ensure Playwright browser is installed (production and dev)
    const browserManager = BrowserManager.getInstance();
    await browserManager.ensureInstalled(getMainWindow());

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Auto-start the embedded node runtime if the payload is present.
    // Missing payload = the machine hasn't enabled the self-hosted node;
    // stay silent and let the renderer offer onboarding instead.
    const nodeRuntime = getNodeRuntimeService();
    nodeRuntime.start().then((result) => {
        if (result.started) {
            console.log("[NodeRuntime] embedded node server is running");
        }
    });
});

app.on("window-all-closed", async () => {
    // Stop the embedded node server before the app exits so the tunnel
    // closes cleanly (backend marks the node OFFLINE immediately).
    await getNodeRuntimeService().stop();

    // Clean up all browser connections
    for (const [sessionId, connection] of allConnections()) {
        try {
            await connection.browser.close();
        } catch (e) {
            console.error(`Error closing browser for ${sessionId}:`, e);
        }
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});
