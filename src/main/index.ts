/**
 * Main process entry — bootstrap and composition ONLY.
 *
 * The layers (one concern per module):
 *   window.ts                     app window + web-contents policies
 *   ipc/register-playwright.ts    channel handlers (transport)
 *   ipc/register-node-runtime.ts  embedded node agent channels (transport)
 *   services/session-launcher.ts  connect/launch/portal flows (behavior)
 *   services/browser-store.ts     connection + status state
 *   services/proxy-bridge.ts      authenticated proxy bridges
 *   services/fingerprint-injection.ts  stealth init script
 *   node/node-agent.ts            embedded self-hosted node agent (native)
 *   browser-manager.ts            Chromium install/executable resolution
 */

import { app, BrowserWindow } from "electron";
import "./env";
import { initAutoUpdater } from "./auto-updater";
import { BrowserManager } from "./browser-manager";
import { registerPlaywrightIpc } from "./ipc/register-playwright";
import { registerNodeRuntimeIpc } from "./ipc/register-node-runtime";
import { registerNodeProvisioningIpc } from "./ipc/register-node-provisioning";
import { getNodeAgent } from "./node/node-agent";
import { allConnections } from "./services/browser-store";
import { createWindow, getMainWindow, installWebContentsPolicies } from "./window";

app.whenReady().then(async () => {
    const win = createWindow();

    // Register the IPC surface once, before any browser session starts.
    registerPlaywrightIpc();
    registerNodeRuntimeIpc();
    registerNodeProvisioningIpc();

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

    // Auto-start the embedded node agent when this machine has been
    // provisioned (node-agent.json present). Not provisioned = the user
    // hasn't enabled the self-hosted node; stay silent and let the
    // renderer offer onboarding.
    const nodeAgent = getNodeAgent();
    const started = nodeAgent.start();
    if (started.started) {
        console.log("[NodeAgent] embedded node agent connecting to tunnel");
    }
});

app.on("window-all-closed", async () => {
    // Stop the embedded node agent before the app exits so the tunnel
    // closes cleanly (backend marks the node OFFLINE immediately) and
    // every session's Chrome flushes its profile to disk.
    await getNodeAgent().stop();

    // Clean up all browser connections
    for (const [sessionId, connection] of allConnections()) {
        try {
            if (connection.browser) {
                await connection.browser.close();
            } else {
                await connection.context.close();
            }
        } catch (e) {
            console.error(`Error closing browser for ${sessionId}:`, e);
        }
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});
