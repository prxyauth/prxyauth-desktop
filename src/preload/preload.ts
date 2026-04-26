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
  // Core Identity
  userAgent?: string;
  userAgentMetadata?: {
    brands: { brand: string; version: string }[];
    fullVersionList: { brand: string; version: string }[];
    mobile: boolean;
    model: string;
    platform: string;
    platformVersion: string;
    architecture: string;
    bitness: string;
  };
  legacyPlatform?: string;
  platform?: string;

  // Environment
  screen?: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
  };
  viewport?: { width: number; height: number };
  deviceScaleFactor?: number;

  // Capabilities
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
  isMobile?: boolean;
  hasTouch?: boolean;

  // Locale / Region
  language?: string;
  timezoneId?: string;

  // Graphics
  webgl?: {
    vendor: string;
    renderer: string;
  };

  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  // Internal / Context Data
  seed?: string;
  proxyIp?: string;
}

interface Proxy {
  host?: string;
  port?: string;
  server?: string;
  username?: string;
  password?: string;
  externalIp?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}

// Expose protected methods to the main world
contextBridge.exposeInMainWorld("prxApi", {
  // Playwright operations
  playwright: {
    connect: (
      wsEndpoint: string,
      sessionId: string,
      fingerprint?: Fingerprint,
    ): Promise<ApiResult> =>
      ipcRenderer.invoke("playwright:connect", {
        wsEndpoint,
        sessionId,
        fingerprint,
      }),

    navigate: (
      sessionId: string,
      url: string,
    ): Promise<ApiResult<{ currentUrl: string }>> =>
      ipcRenderer.invoke("playwright:navigate", { sessionId, url }),

    getPageInfo: (sessionId: string): Promise<ApiResult<PageInfo>> =>
      ipcRenderer.invoke("playwright:getPageInfo", { sessionId }),

    screenshot: (
      sessionId: string,
    ): Promise<ApiResult<{ screenshot: string }>> =>
      ipcRenderer.invoke("playwright:screenshot", { sessionId }),

    disconnect: (sessionId: string): Promise<ApiResult> =>
      ipcRenderer.invoke("playwright:disconnect", { sessionId }),

    listConnections: (): Promise<ApiResult<{ sessions: string[] }>> =>
      ipcRenderer.invoke("playwright:listConnections"),

    launchLocal: (
      sessionId: string,
      storageState: unknown,
      proxy?: Proxy,
      fingerprint?: Fingerprint,
      session?: { email?: string; password?: string; provider?: string; status?: string },
      frontendUrl?: string,
    ): Promise<ApiResult> =>
      ipcRenderer.invoke("playwright:launchLocal", {
        sessionId,
        storageState,
        proxy,
        fingerprint,
        session,
        frontendUrl,
      }),

    launchSyncedProfile: (
      sessionId: string,
      apiBaseUrl: string,
      authToken: string,
    ): Promise<ApiResult<{ wsEndpoint: string }>> =>
      ipcRenderer.invoke("playwright:launchSyncedProfile", {
        sessionId,
        apiBaseUrl,
        authToken,
      }),

    bringToFront: (sessionId: string): Promise<ApiResult> =>
      ipcRenderer.invoke("playwright:bringToFront", { sessionId }),

    closeLocal: (sessionId: string): Promise<ApiResult> =>
      ipcRenderer.invoke("playwright:closeLocal", { sessionId }),

    showPortal: (
      sessionId: string,
      storageState: unknown,
      proxy?: Proxy,
      fingerprint?: Fingerprint,
      session?: { email?: string; password?: string },
      frontendUrl?: string,
    ): Promise<ApiResult> =>
      ipcRenderer.invoke("playwright:showPortal", {
        sessionId,
        storageState,
        proxy,
        fingerprint,
        session,
        frontendUrl,
      }),

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

    // Event listener for browser status change events (launching, open, closed)
    onBrowserStatusChanged: (
      callback: (data: { sessionId: string; status: string }) => void,
    ): (() => void) => {
      const handler = (
        _event: unknown,
        data: { sessionId: string; status: string },
      ) => {
        callback(data);
      };
      ipcRenderer.on("playwright:browserStatusChanged", handler);
      return () => {
        ipcRenderer.removeListener(
          "playwright:browserStatusChanged",
          handler,
        );
      };
    },
  },
  browser: {
    getStatus: () => ipcRenderer.invoke("browser:getStatus"),
    install: () => ipcRenderer.invoke("browser:install"),
    onInstallStarted: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("browser:install-started", handler);
      return () =>
        ipcRenderer.removeListener("browser:install-started", handler);
    },
    onInstallProgress: (callback: (progress: { percent: number }) => void) => {
      const handler = (_event: any, data: { percent: number }) =>
        callback(data);
      ipcRenderer.on("browser:install-progress", handler);
      return () =>
        ipcRenderer.removeListener("browser:install-progress", handler);
    },
    onInstallSuccess: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on("browser:install-success", handler);
      return () =>
        ipcRenderer.removeListener("browser:install-success", handler);
    },
    onInstallFailed: (callback: (error: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on("browser:install-failed", handler);
      return () =>
        ipcRenderer.removeListener("browser:install-failed", handler);
    },
  },
});

// Type declaration for TypeScript
declare global {
  interface Window {
    prxApi: {
      playwright: {
        connect: (
          wsEndpoint: string,
          sessionId: string,
          fingerprint?: Fingerprint,
        ) => Promise<ApiResult>;
        navigate: (
          sessionId: string,
          url: string,
        ) => Promise<ApiResult<{ currentUrl: string }>>;
        getPageInfo: (sessionId: string) => Promise<ApiResult<PageInfo>>;
        screenshot: (
          sessionId: string,
        ) => Promise<ApiResult<{ screenshot: string }>>;
        disconnect: (sessionId: string) => Promise<ApiResult>;
        listConnections: () => Promise<ApiResult<{ sessions: string[] }>>;
        launchLocal: (
          sessionId: string,
          storageState: unknown,
          proxy?: Proxy,
          fingerprint?: Fingerprint,
          session?: { email?: string; password?: string; provider?: string; status?: string },
          frontendUrl?: string,
        ) => Promise<ApiResult>;
        launchSyncedProfile: (
          sessionId: string,
          apiBaseUrl: string,
          authToken: string,
        ) => Promise<ApiResult<{ wsEndpoint: string }>>;
        bringToFront: (sessionId: string) => Promise<ApiResult>;
        closeLocal: (sessionId: string) => Promise<ApiResult>;
        showPortal: (
          sessionId: string,
          storageState: unknown,
          proxy?: Proxy,
          fingerprint?: Fingerprint,
          session?: { email?: string; password?: string },
          frontendUrl?: string,
        ) => Promise<ApiResult>;
        onBrowserClosed: (callback: (sessionId: string) => void) => () => void;
        onBrowserStatusChanged: (
          callback: (data: { sessionId: string; status: string }) => void,
        ) => () => void;
      };
      browser: {
        getStatus: () => Promise<{
          isInstalled: boolean;
          isDownloading: boolean;
          progress: { percent: number };
          path: string;
        }>;
        install: () => Promise<{ success: boolean; message?: string }>;
        onInstallStarted: (callback: () => void) => () => void;
        onInstallProgress: (
          callback: (progress: { percent: number }) => void,
        ) => () => void;
        onInstallSuccess: (callback: () => void) => () => void;
        onInstallFailed: (callback: (error: any) => void) => () => void;
      };
    };
  }
}
