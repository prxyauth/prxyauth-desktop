/**
 * Main process entry — bootstrap and composition ONLY.
 *
 * The layers (one concern per module):
 *   window.ts                     app window + web-contents policies
 *   ipc/register-playwright.ts    channel handlers (transport)
 *   services/session-launcher.ts  connect/launch/portal flows (behavior)
 *   services/browser-store.ts     connection + status state
 *   services/proxy-bridge.ts      authenticated proxy bridges
 *   services/fingerprint-injection.ts  stealth init script
 *   browser-manager.ts            Chromium install/executable resolution
 */

import { app, BrowserWindow } from "electron";
import "./env";
import { initAutoUpdater } from "./auto-updater";
import { BrowserManager } from "./browser-manager";
import { registerPlaywrightIpc } from "./ipc/register-playwright";
import { allConnections } from "./services/browser-store";
import { createWindow, getMainWindow, installWebContentsPolicies } from "./window";

app.whenReady().then(async () => {
    const win = createWindow();

    // Register the IPC surface once, before any browser session starts.
    registerPlaywrightIpc();

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
});

app.on("window-all-closed", async () => {
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
