/**
 * Window lifecycle — creation, dev/prod loading, external-link policy.
 * Owns the mainWindow reference and notifies the browser store so status
 * events can reach the renderer.
 */

import { app, BrowserWindow, shell } from "electron";
import * as path from "path";
import { bindWindow } from "./services/browser-store";

// Development port - must match vite --port in package.json
const DEV_PORT = 5180;

let mainWindow: BrowserWindow | null = null;

export function createWindow(): BrowserWindow {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "../preload/preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: "PRXY Browser Client",
        icon: path.join(__dirname, "../../assets/icon.png"),
    });

    // Let the browser store route status events to this window.
    bindWindow(mainWindow);

    // Always load from Vite dev server in development
    const isDev = !app.isPackaged;

    if (isDev) {
        const devUrl = `http://localhost:${DEV_PORT}`;
        console.log(`Loading from dev server: ${devUrl}`);
        void mainWindow.loadURL(devUrl);
        mainWindow.webContents.openDevTools();
    } else {
        void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
        bindWindow(null);
    });

    return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
    return mainWindow;
}

/** App-level web-contents hardening, installed once at bootstrap. */
export function installWebContentsPolicies(): void {
    // Handle external links — http/https only. Forwarding arbitrary schemes
    // (file://, chrome://, custom protocol handlers) to the OS is a
    // well-known Electron escape hatch (security checklist item).
    app.on("web-contents-created", (_event, contents) => {
        contents.setWindowOpenHandler(({ url }) => {
            if (/^https?:/i.test(url)) {
                void shell.openExternal(url);
            }
            return { action: "deny" };
        });
    });
}