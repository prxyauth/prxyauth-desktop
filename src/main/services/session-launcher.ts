/**
 * Session launcher — the two ways a session's browser comes to life:
 * connecting to a remote Playwright WS endpoint, or launching a local
 * headful Chromium with fingerprint/proxy/storage state applied.
 *
 * Pure service layer: no ipcMain here. Handlers live in
 * ipc/register-playwright.ts and only validate/delegate.
 */

import { chromium } from "playwright-core";
import { BrowserManager } from "../browser-manager";
import { injectFingerprint } from "./fingerprint-injection";
import {
    cleanupProxyBridge,
    prepareProxy,
    type ProxyInput,
} from "./proxy-bridge";
import {
    deleteConnection,
    emitBrowserClosed,
    emitBrowserStatus,
    getConnection,
    setConnection,
} from "./browser-store";

export interface FingerprintInput {
    userAgent?: string;
    language?: string;
    timezoneId?: string;
    viewport?: { width: number; height: number };
    screen?: { width: number; height: number };
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    geolocation?: { latitude: number; longitude: number };
    externalIp?: string;
    [key: string]: unknown;
}

export interface SessionInfoInput {
    provider?: string;
    email?: string;
    [key: string]: unknown;
}

/** Gracefully terminate a session's browser; true if it was live. */
export async function terminateBrowser(sessionId: string): Promise<boolean> {
    const connection = getConnection(sessionId);
    if (!connection) return false;

    try {
        console.log(`[Main] Terminating browser for session: ${sessionId}`);
        await connection.browser.close();
        // The 'disconnected' listener handles map deletion and bridge cleanup
        return true;
    } catch (error) {
        console.error(`[Main] Error terminating browser for ${sessionId}:`, error);
        // Fallback cleanup if close fails
        deleteConnection(sessionId);
        await cleanupProxyBridge(sessionId);
        emitBrowserClosed(sessionId);
        return false;
    }
}

/** Connect to a remote Playwright WS endpoint for a session. */
export async function connectRemote(
    wsEndpoint: string,
    sessionId: string,
    fingerprint?: FingerprintInput,
): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        console.log(`Connecting to Playwright server: ${wsEndpoint}`);

        const browser = await chromium.connect(wsEndpoint);

        // Listen for browser disconnection (remote server closes or connection lost)
        browser.on("disconnected", () => {
            console.log(`Remote browser disconnected for session: ${sessionId}`);
            deleteConnection(sessionId);
            emitBrowserClosed(sessionId);
        });

        // Use existing context and page from remote server
        let context = browser.contexts()[0];

        // If no context exists (rare for remote server), create one with exact fingerprint parity
        if (!context) {
            console.log(
                `No remote context found for ${sessionId}, creating one with fingerprint parity...`,
            );
            context = await browser.newContext({
                userAgent: fingerprint?.userAgent,
                timezoneId: fingerprint?.timezoneId,
                viewport: fingerprint?.viewport,
                screen: fingerprint?.screen,
                deviceScaleFactor: fingerprint?.deviceScaleFactor,
                isMobile: fingerprint?.isMobile,
                hasTouch: fingerprint?.hasTouch,
            });
        }

        const page = context.pages()[0] || (await context.newPage());
        await page.bringToFront();

        setConnection(sessionId, { browser, context, page });

        console.log(`Successfully connected to session ${sessionId}`);
        return { success: true, message: "Connected successfully" };
    } catch (error) {
        console.error("Failed to connect:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Connection failed",
        };
    }
}

/** Launch a local headful browser for a session with full identity state. */
export async function launchLocal(input: {
    sessionId: string;
    storageState?: string;
    proxy?: ProxyInput;
    fingerprint?: FingerprintInput;
    session?: SessionInfoInput;
    frontendUrl?: string;
}): Promise<{ success: boolean; message?: string; error?: string }> {
    const { sessionId, storageState, proxy, fingerprint, session, frontendUrl } = input;
    try {
        // Check if already open and reuse if possible
        const existingConnection = getConnection(sessionId);
        if (existingConnection) {
            console.log(`[Main] Reusing existing browser for session: ${sessionId}`);
            try {
                await existingConnection.page.bringToFront();
                return { success: true, message: "Reused existing browser instance" };
            } catch {
                console.log(
                    `[Main] Existing browser for ${sessionId} seems dead, launching new one.`,
                );
                deleteConnection(sessionId);
                await cleanupProxyBridge(sessionId);
            }
        }

        console.log(`Launching local browser for session: ${sessionId}`);
        console.log(`UserAgent to apply: ${fingerprint?.userAgent}`);
        console.log(`Proxy data received:`, JSON.stringify(proxy, null, 2));

        emitBrowserStatus(sessionId, "launching");

        // Prepare proxy (returns object with server, username, password)
        const proxyConfig = await prepareProxy(sessionId, proxy);

        const locale = fingerprint?.language || "en-US";

        const browser = await chromium.launch({
            executablePath: BrowserManager.getInstance().getExecutablePath(),
            headless: false,
            args: [
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-infobars",
                "--window-position=0,0",
                "--no-first-run",
                "--no-default-browser-check",
                `--lang=${locale}`,
                `--accept-lang=${locale}`,
            ],
        });

        // Listen for browser disconnection (user closes browser directly)
        browser.on("disconnected", async () => {
            console.log(`Browser disconnected for session: ${sessionId}`);
            deleteConnection(sessionId);
            // Notify UI immediately, before slow cleanup
            emitBrowserClosed(sessionId);
            // Cleanup proxy bridge after notifying (can be slow)
            await cleanupProxyBridge(sessionId);
        });

        const context = await browser.newContext({
            storageState: storageState || undefined,
            viewport: fingerprint?.viewport || { width: 1280, height: 720 },
            userAgent: fingerprint?.userAgent,
            deviceScaleFactor: fingerprint?.deviceScaleFactor || 1,
            isMobile: fingerprint?.isMobile || false,
            hasTouch: fingerprint?.hasTouch || false,
            locale: locale,
            timezoneId: fingerprint?.timezoneId || "America/New_York",
            geolocation: fingerprint?.geolocation,
            permissions: ["geolocation"],
            extraHTTPHeaders: {
                "Accept-Language": `${locale},${locale.split("-")[0]};q=0.9,en;q=0.8`,
            },
            proxy: proxyConfig
                ? {
                      server: proxyConfig.server,
                      username: proxyConfig.username,
                      password: proxyConfig.password,
                  }
                : undefined,
            // Stealth-tooling trade-offs, deliberately enabled for the
            // account-automation surface (see CONSISTENCY-PLAN.md item 8).
            bypassCSP: true,
            ignoreHTTPSErrors: true,
        });

        // Monitor context for user closure
        context.on("close", async () => {
            console.log(`[Main] Context closed for session: ${sessionId}`);
            await terminateBrowser(sessionId);
        });

        // Override default new tab behavior to visit Google.com
        let isFirstPage = true;
        context.on("page", (newPage) => {
            // Detect if all pages are closed (user closes window)
            newPage.on("close", () => {
                setTimeout(async () => {
                    try {
                        if (context.pages().length === 0) {
                            console.log(`[Main] All pages closed for session: ${sessionId}`);
                            await terminateBrowser(sessionId);
                        }
                    } catch {
                        // Ignore if context is destroyed
                    }
                }, 100);
            });

            if (isFirstPage) {
                isFirstPage = false;
                return;
            }

            const handleNewTab = async () => {
                try {
                    if (newPage.isClosed()) return;
                    const url = newPage.url();
                    if (
                        url === "about:blank" ||
                        url.startsWith("chrome://newtab") ||
                        url.startsWith("chrome://new-tab-page")
                    ) {
                        await newPage.goto("https://google.com").catch(() => {});
                    }
                } catch {
                    // Ignore if closed or navigation fails
                }
            };

            void handleNewTab();
            newPage.on("domcontentloaded", () => void handleNewTab());
        });

        // [DETECTION BYPASS] Google detection of browser tampering is extremely aggressive.
        // We skip JS-based fingerprint injection for Google to favor native browser properties.
        const isGoogle =
            session?.provider === "GOOGLE" ||
            session?.email?.toLowerCase().endsWith("@gmail.com") ||
            session?.email?.toLowerCase().endsWith("@googlemail.com");

        if (!isGoogle) {
            await injectFingerprint(context, {
                ...fingerprint,
                proxyIp: proxy?.externalIp,
                sessionId: sessionId,
            });
        }

        const page = await context.newPage();

        const baseUrl = frontendUrl || "http://localhost:3000";
        await page.goto(`${baseUrl}/portal/${sessionId}`);

        // Store the connection
        setConnection(sessionId, { browser, context, page });
        emitBrowserStatus(sessionId, "open");

        return { success: true, message: "Local browser launched" };
    } catch (error) {
        console.error("Failed to launch local browser:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Launch failed",
        };
    }
}

/** Navigate an existing connection back to its portal page. */
export async function showPortal(
    sessionId: string,
    frontendUrl?: string,
): Promise<{ success: boolean; error?: string }> {
    try {
        const connection = getConnection(sessionId);
        if (!connection) {
            return { success: false, error: "No active connection" };
        }

        const baseUrl = frontendUrl || "http://localhost:3000";
        await connection.page.goto(`${baseUrl}/portal/${sessionId}`);
        await connection.page.bringToFront();

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to show portal",
        };
    }
}