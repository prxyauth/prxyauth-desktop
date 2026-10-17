/**
 * IPC bridge contract — the ONE ambient declaration of Window.prxApi.
 *
 * The bridge implementation lives in src/preload/preload.ts; renderer
 * features consume `window.prxApi` directly (never `(window as any)`).
 * Everything lives inside `declare global` because this is a global
 * script (no imports/exports) — top-level `declare global` only works
 * in modules, and skipLibCheck would silently swallow the error.
 */

declare global {
    interface IpcApiResult<T = unknown> {
        success: boolean;
        error?: string;
        message?: string;
        data?: T;
    }

    interface IpcPageInfo {
        url: string;
        title: string;
    }

    interface IpcBrowserStatus {
        isInstalled: boolean;
        isDownloading: boolean;
        progress: { percent: number; message: string; components: Record<string, unknown> };
        path: string;
    }

    interface IpcProxy {
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

    interface Window {
        prxApi: {
            playwright: {
                connect: (
                    wsEndpoint: string,
                    sessionId: string,
                    fingerprint?: unknown,
                ) => Promise<IpcApiResult>;
                navigate: (
                    sessionId: string,
                    url: string,
                ) => Promise<IpcApiResult<{ currentUrl: string }>>;
                getPageInfo: (sessionId: string) => Promise<IpcApiResult<IpcPageInfo>>;
                screenshot: (sessionId: string) => Promise<IpcApiResult<{ screenshot: string }>>;
                disconnect: (sessionId: string) => Promise<IpcApiResult>;
                listConnections: () => Promise<{
                    success: boolean;
                    sessions: string[];
                    statuses: Record<string, string>;
                    error?: string;
                }>;
                launchLocal: (
                    sessionId: string,
                    storageState: unknown,
                    proxy?: IpcProxy,
                    fingerprint?: unknown,
                    session?: { email?: string; password?: string },
                    frontendUrl?: string,
                ) => Promise<IpcApiResult>;
                bringToFront: (sessionId: string) => Promise<IpcApiResult>;
                closeLocal: (sessionId: string) => Promise<IpcApiResult>;
                showPortal: (
                    sessionId: string,
                    storageState: unknown,
                    proxy?: IpcProxy,
                    fingerprint?: unknown,
                    session?: { email?: string; password?: string },
                    frontendUrl?: string,
                ) => Promise<IpcApiResult>;
                onBrowserClosed: (callback: (sessionId: string) => void) => () => void;
                onBrowserStatusChanged: (
                    callback: (data: { sessionId: string; status: string }) => void,
                ) => () => void;
            };
            browser: {
                getStatus: () => Promise<IpcBrowserStatus>;
                install: () => Promise<{ success: boolean; message?: string }>;
                onInstallStarted: (callback: () => void) => () => void;
                onInstallProgress: (callback: (progress: IpcBrowserStatus["progress"]) => void) => () => void;
                onInstallSuccess: (callback: () => void) => () => void;
                onInstallFailed: (callback: (error: any) => void) => () => void;
            };
            nodeRuntime: {
                getInfo: () => Promise<
                    IpcApiResult<{
                        status: string;
                        pid?: number;
                        port: number;
                        lastExitCode?: number | null;
                        lastCrashAt?: string | null;
                        restartCount: number;
                    }>
                >;
                isInstalled: () => Promise<IpcApiResult<{ status: string }>>;
                start: () => Promise<IpcApiResult>;
                stop: () => Promise<IpcApiResult>;
            };
            nodeProvisioning: {
                status: () => Promise<IpcApiResult<{ provisioned: boolean }>>;
                enable: (req: {
                    backendUrl: string;
                    token: string;
                    nodeName?: string;
                    existingNodeKey?: string;
                }) => Promise<IpcApiResult>;
            };
        };
    }
}

// Module marker — importing this file applies the global augmentation.
export {};
