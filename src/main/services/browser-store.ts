/**
 * Browser connection store — the single owner of per-session browser
 * state in the main process: live connections, session statuses, and the
 * lifecycle notifications the renderer subscribes to.
 *
 * Everything that used to be module-level Maps in index.ts lives here so
 * IPC handlers and app-lifecycle code share ONE source of truth.
 */

import type { Browser, BrowserContext, Page } from "playwright-core";

export interface BrowserConnection {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}

/** Live sessionId → connection map. */
const connectedBrowsers = new Map<string, BrowserConnection>();

/** sessionId → lifecycle status ("launching" | "open"; "closed" removes). */
const browserSessionStatuses = new Map<string, string>();

/** Receives the main window when created; cleared on close. */
let mainWindow: Electron.BrowserWindow | null = null;

export function bindWindow(win: Electron.BrowserWindow | null): void {
    mainWindow = win;
}

/** Notify the renderer of a session's browser status. */
export function emitBrowserStatus(sessionId: string, status: string): void {
    console.log(`[Main] emitBrowserStatus: ${sessionId} → ${status}`);
    if (status === "closed") {
        browserSessionStatuses.delete(sessionId);
    } else {
        browserSessionStatuses.set(sessionId, status);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("playwright:browserStatusChanged", {
            sessionId,
            status,
        });
    } else {
        console.warn(`[Main] mainWindow not available, cannot send status event`);
    }
}

/** Tell the renderer a session's browser has closed. */
export function emitBrowserClosed(sessionId: string): void {
    emitBrowserStatus(sessionId, "closed");
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("playwright:browserClosed", { sessionId });
    }
}

export function getConnection(sessionId: string): BrowserConnection | undefined {
    return connectedBrowsers.get(sessionId);
}

export function setConnection(sessionId: string, connection: BrowserConnection): void {
    connectedBrowsers.set(sessionId, connection);
}

export function deleteConnection(sessionId: string): void {
    connectedBrowsers.delete(sessionId);
}

export function allConnections(): Map<string, BrowserConnection> {
    return connectedBrowsers;
}

export function sessionStatuses(): Record<string, string> {
    return Object.fromEntries(browserSessionStatuses);
}