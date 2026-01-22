/**
 * Preload Script - Secure IPC Bridge
 * Exposes safe APIs to the renderer process
 */

import { contextBridge, ipcRenderer } from "electron";

// Type definitions
interface ApiResult<T = unknown> {
    success: boolean;
    error?: string;
    message?: string;
    data?: T;
}

interface PageInfo {
    url: string;
    title: string;
}

interface Fingerprint {
    userAgent?: string;
    timezoneId?: string;
    viewport?: { width: number; height: number };
    screen?: { width: number; height: number };
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
}

interface Proxy {
    host?: string;
    port?: string;
    username?: string;
    password?: string;
}

// Expose protected methods to the main world
contextBridge.exposeInMainWorld("prxApi", {
    // Playwright operations
    playwright: {
        connect: (wsEndpoint: string, sessionId: string, fingerprint?: Fingerprint): Promise<ApiResult> =>
            ipcRenderer.invoke("playwright:connect", { wsEndpoint, sessionId, fingerprint }),

        navigate: (sessionId: string, url: string): Promise<ApiResult<{ currentUrl: string }>> =>
            ipcRenderer.invoke("playwright:navigate", { sessionId, url }),

        getPageInfo: (sessionId: string): Promise<ApiResult<PageInfo>> =>
            ipcRenderer.invoke("playwright:getPageInfo", { sessionId }),

        screenshot: (sessionId: string): Promise<ApiResult<{ screenshot: string }>> =>
            ipcRenderer.invoke("playwright:screenshot", { sessionId }),

        disconnect: (sessionId: string): Promise<ApiResult> =>
            ipcRenderer.invoke("playwright:disconnect", { sessionId }),

        listConnections: (): Promise<ApiResult<{ sessions: string[] }>> =>
            ipcRenderer.invoke("playwright:listConnections"),

        launchLocal: (sessionId: string, storageState: unknown, proxy?: Proxy, fingerprint?: Fingerprint, session?: { email?: string; password?: string }): Promise<ApiResult> =>
            ipcRenderer.invoke("playwright:launchLocal", { sessionId, storageState, proxy, fingerprint, session }),

        bringToFront: (sessionId: string): Promise<ApiResult> =>
            ipcRenderer.invoke("playwright:bringToFront", { sessionId }),

        closeLocal: (sessionId: string): Promise<ApiResult> =>
            ipcRenderer.invoke("playwright:closeLocal", { sessionId }),

        showPortal: (sessionId: string, storageState: unknown, proxy?: Proxy, fingerprint?: Fingerprint, session?: { email?: string; password?: string }): Promise<ApiResult> =>
            ipcRenderer.invoke("playwright:showPortal", { sessionId, storageState, proxy, fingerprint, session }),

        // Event listener for browser closed events
        onBrowserClosed: (callback: (sessionId: string) => void): (() => void) => {
            const handler = (_event: unknown, data: { sessionId: string }) => {
                callback(data.sessionId);
            };
            ipcRenderer.on("playwright:browserClosed", handler);
            // Return cleanup function
            return () => {
                ipcRenderer.removeListener("playwright:browserClosed", handler);
            };
        },
    },
});

// Type declaration for TypeScript
declare global {
    interface Window {
        prxApi: {
            playwright: {
                connect: (wsEndpoint: string, sessionId: string, fingerprint?: Fingerprint) => Promise<ApiResult>;
                navigate: (sessionId: string, url: string) => Promise<ApiResult<{ currentUrl: string }>>;
                getPageInfo: (sessionId: string) => Promise<ApiResult<PageInfo>>;
                screenshot: (sessionId: string) => Promise<ApiResult<{ screenshot: string }>>;
                disconnect: (sessionId: string) => Promise<ApiResult>;
                listConnections: () => Promise<ApiResult<{ sessions: string[] }>>;
                launchLocal: (sessionId: string, storageState: unknown, proxy?: Proxy, fingerprint?: Fingerprint, session?: { email?: string; password?: string }) => Promise<ApiResult>;
                bringToFront: (sessionId: string) => Promise<ApiResult>;
                closeLocal: (sessionId: string) => Promise<ApiResult>;
                showPortal: (sessionId: string, storageState: unknown, proxy?: Proxy, fingerprint?: Fingerprint, session?: { email?: string; password?: string }) => Promise<ApiResult>;
                onBrowserClosed: (callback: (sessionId: string) => void) => () => void;
            };
        };
    }
}

