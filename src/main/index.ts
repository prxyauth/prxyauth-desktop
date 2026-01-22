/**
 * Electron Main Process
 * Manages the application window and Playwright browser connections
 */

import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "path";
import { Browser, BrowserContext, chromium, Page } from "playwright";
import * as ProxyChain from "proxy-chain";
import { initAutoUpdater } from "./auto-updater";

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Store for connected browsers
const connectedBrowsers: Map<
  string,
  { browser: Browser; context: BrowserContext; page: Page }
> = new Map();

// Store for proxy bridges (authenticated proxy tunnels)
const proxyBridges: Map<string, string> = new Map();

// Development port - must match vite --port in package.json
const DEV_PORT = 5180;

function createWindow() {
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

  // Always load from Vite dev server in development
  // Check if we're running from dist (compiled) vs source
  const isDev = !app.isPackaged;

  if (isDev) {
    // Development mode - load from Vite
    const devUrl = `http://localhost:${DEV_PORT}`;
    console.log(`Loading from dev server: ${devUrl}`);
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load built files
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC Handlers

/**
 * Connect to a Playwright WebSocket server
 */
ipcMain.handle(
  "playwright:connect",
  async (event, { wsEndpoint, sessionId, fingerprint }) => {
    try {
      console.log(`Connecting to Playwright server: ${wsEndpoint}`);

      const browser = await chromium.connect(wsEndpoint);

      // Listen for browser disconnection (remote server closes or connection lost)
      browser.on("disconnected", () => {
        console.log(`Remote browser disconnected for session: ${sessionId}`);
        connectedBrowsers.delete(sessionId);
        // Notify renderer that browser was closed
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("playwright:browserClosed", {
            sessionId,
          });
        }
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

      // Store the connection
      connectedBrowsers.set(sessionId, { browser, context, page });

      console.log(`Successfully connected to session ${sessionId}`);
      return { success: true, message: "Connected successfully" };
    } catch (error) {
      console.error("Failed to connect:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  },
);

/**
 * Navigate to a URL in the connected browser
 */
ipcMain.handle("playwright:navigate", async (event, { sessionId, url }) => {
  try {
    const connection = connectedBrowsers.get(sessionId);
    if (!connection) {
      return { success: false, error: "No active connection for this session" };
    }

    await connection.page.goto(url, { waitUntil: "domcontentloaded" });
    return { success: true, currentUrl: connection.page.url() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Navigation failed",
    };
  }
});

/**
 * Get current page info
 */
ipcMain.handle("playwright:getPageInfo", async (event, { sessionId }) => {
  try {
    const connection = connectedBrowsers.get(sessionId);
    if (!connection) {
      return { success: false, error: "No active connection for this session" };
    }

    const url = connection.page.url();
    const title = await connection.page.title();
    return { success: true, url, title };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get page info",
    };
  }
});

/**
 * Take a screenshot
 */
ipcMain.handle("playwright:screenshot", async (event, { sessionId }) => {
  try {
    const connection = connectedBrowsers.get(sessionId);
    if (!connection) {
      return { success: false, error: "No active connection for this session" };
    }

    const buffer = await connection.page.screenshot({ type: "png" });
    const base64 = buffer.toString("base64");
    return { success: true, screenshot: `data:image/png;base64,${base64}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Screenshot failed",
    };
  }
});

/**
 * Terminate a local browser instance
 */
ipcMain.handle("playwright:closeLocal", async (event, { sessionId }) => {
  try {
    const success = await terminateBrowser(sessionId);
    return {
      success: true,
      message: success
        ? "Browser closed successfully"
        : "Browser already closed",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Close failed",
    };
  }
});

/**
 * Helper to terminate a browser and clean up resources
 */
async function terminateBrowser(sessionId: string): Promise<boolean> {
  const connection = connectedBrowsers.get(sessionId);
  if (!connection) return false;

  try {
    console.log(`[Main] Terminating browser for session: ${sessionId}`);
    await connection.browser.close();
    // The 'disconnected' listener will handle map deletion and bridge cleanup
    return true;
  } catch (error) {
    console.error(`[Main] Error terminating browser for ${sessionId}:`, error);
    // Fallback cleanup if close fails
    connectedBrowsers.delete(sessionId);
    await cleanupProxyBridge(sessionId);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("playwright:browserClosed", { sessionId });
    }
    return false;
  }
}

/**
 * Disconnect/Close shortcut
 */
ipcMain.handle("playwright:disconnect", async (event, { sessionId }) => {
  try {
    const success = await terminateBrowser(sessionId);
    if (!success) {
      return { success: false, error: "No active connection for this session" };
    }
    return { success: true, message: "Disconnected successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Disconnect failed",
    };
  }
});

/**
 * Prepare proxy configuration with normalization and optional bridge
 * This creates an anonymized proxy bridge to handle authenticated proxies
 */
async function prepareProxy(
  sessionId: string,
  proxy?: {
    host?: string;
    port?: string;
    server?: string;
    username?: string;
    password?: string;
  },
): Promise<
  { server: string; username?: string; password?: string } | undefined
> {
  if (!proxy) return undefined;

  let proxyUrl: string | undefined;

  // 1. Determine the base proxy URL
  if (proxy.server) {
    proxyUrl = proxy.server;
    if (!proxyUrl.includes("://")) {
      proxyUrl = `http://${proxyUrl}`;
    }
  } else if (proxy.host && proxy.port) {
    proxyUrl = `http://${proxy.host}:${proxy.port}`;
  }

  if (!proxyUrl) {
    console.log(`No valid proxy server for session ${sessionId}`);
    return undefined;
  }

  // Prepare full URL with credentials for proxy-chain if possible
  let authenticatedUrl = proxyUrl;
  if (proxy.username && proxy.password && !proxyUrl.includes("@")) {
    try {
      const url = new URL(proxyUrl);
      url.username = proxy.username;
      url.password = proxy.password;
      authenticatedUrl = url.toString();
    } catch (e) {}
  }

  try {
    const maskedUrl = authenticatedUrl.replace(/:[^:@]+@/, ":****@");
    console.log(
      `[Proxy] Creating bridge for session ${sessionId}: ${maskedUrl}`,
    );

    const anonymizedProxy = await ProxyChain.anonymizeProxy(authenticatedUrl);
    console.log(`[Proxy] Bridge created at: ${anonymizedProxy}`);
    proxyBridges.set(sessionId, anonymizedProxy);

    return { server: anonymizedProxy };
  } catch (e) {
    console.warn(
      `[Proxy] Bridge failed for ${sessionId}, using native auth fallback:`,
      (e as Error).message,
    );
    return {
      server: proxyUrl,
      username: proxy.username,
      password: proxy.password,
    };
  }
}

/**
 * Advanced Fingerprint Injection
 * Synchronizes browser properties with the target identity
 */
async function injectFingerprint(context: any, fp: any): Promise<void> {
  if (!fp) return;

  const fpString = JSON.stringify(fp);
  const scriptContent = `
    (function(fp) {
        const seed = fp.sessionId || 'default';
        const mulberry32 = (a) => () => {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
        const hash = Array.from(seed).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0);
        const rand = mulberry32(hash || 1);

        const patch = (obj, prop, value) => {
            if (value === undefined || value === null) return;
            try {
                Object.defineProperty(obj, prop, { 
                    get: () => value, 
                    set: (v) => {},
                    configurable: true, 
                    enumerable: true 
                });
            } catch (e) {}
        };

        const proto = Object.getPrototypeOf(navigator);

        // 1. Navigator & Hardware
        patch(navigator, 'hardwareConcurrency', fp.hardwareConcurrency || 8);
        patch(navigator, 'deviceMemory', fp.deviceMemory || 8);
        patch(navigator, 'userAgent', fp.userAgent);
        patch(navigator, 'appVersion', fp.userAgent.replace("Mozilla/", ""));
        patch(navigator, 'vendor', 'Google Inc.');
        patch(navigator, 'appName', 'Netscape');
        patch(navigator, 'language', fp.language || 'en-US');
        patch(navigator, 'languages', [fp.language || 'en-US', (fp.language || 'en-US').split("-")[0]]);
        
        // Match platform to UA (Priority: Explicit Platform -> UA Mapping -> Win32)
        let platform = fp.platform;
        if (!platform || platform === 'Win32' && fp.userAgent.includes("Mac")) {
            platform = fp.userAgent.includes("Mac") ? "MacIntel" : 
                       fp.userAgent.includes("Linux") ? "Linux x86_64" : "Win32";
        }
        patch(navigator, 'platform', platform);
        
        // Timezone Consistency (Intl.DateTimeFormat)
        if (fp.timezoneId) {
            try {
                const targetTimezone = fp.timezoneId;
                const OriginalDTF = Intl.DateTimeFormat;
                const DateTimeFormatProxy = function(locales, options = {}) {
                    const opts = { ...options };
                    if (!opts.timeZone) opts.timeZone = targetTimezone;
                    return new OriginalDTF(locales, opts);
                };
                DateTimeFormatProxy.prototype = OriginalDTF.prototype;
                DateTimeFormatProxy.supportedLocalesOf = OriginalDTF.supportedLocalesOf.bind(OriginalDTF);
                Object.defineProperty(Intl, 'DateTimeFormat', {
                    value: DateTimeFormatProxy,
                    writable: true,
                    configurable: true
                });
            } catch (e) {}
        }
        
        // Webdriver bypass
        patch(proto, 'webdriver', false);

        if (fp.userAgentMetadata) {
            const platformName = fp.userAgent.includes("Mac") ? "macOS" : 
                               fp.userAgent.includes("Linux") ? "Linux" : "Windows";
            
            const uaData = {
                brands: fp.userAgentMetadata.brands,
                mobile: fp.userAgentMetadata.mobile,
                platform: platformName,
                getHighEntropyValues: (hints) => Promise.resolve({
                    brands: fp.userAgentMetadata.brands,
                    mobile: fp.userAgentMetadata.mobile,
                    platform: platformName,
                    architecture: fp.userAgentMetadata.architecture,
                    bitness: fp.userAgentMetadata.bitness,
                    model: fp.userAgentMetadata.model,
                    platformVersion: fp.userAgentMetadata.platformVersion,
                    fullVersionList: fp.userAgentMetadata.fullVersionList
                }),
                toJSON: () => ({ brands: fp.userAgentMetadata.brands, mobile: fp.userAgentMetadata.mobile, platform: platformName })
            };
            patch(navigator, 'userAgentData', uaData);
        }

        // 2. Plugins & MimeTypes Mock
        try {
            const pluginList = [
                { name: "PDF Viewer", filename: "internal-pdf-viewer", description: "Portable Document Format" },
                { name: "Chrome PDF Viewer", filename: "internal-pdf-viewer", description: "Portable Document Format" },
                { name: "Chromium PDF Viewer", filename: "internal-pdf-viewer", description: "Portable Document Format" },
                { name: "Microsoft Edge PDF Viewer", filename: "internal-pdf-viewer", description: "Portable Document Format" },
                { name: "WebKit built-in PDF", filename: "internal-pdf-viewer", description: "Portable Document Format" }
            ];
            
            const mimeTypeList = [
                { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format" },
                { type: "text/pdf", suffixes: "pdf", description: "Portable Document Format" }
            ];

            const mockPlugins = Object.create(PluginArray.prototype);
            pluginList.forEach((p, i) => {
                const plugin = Object.create(Plugin.prototype);
                patch(plugin, 'name', p.name);
                patch(plugin, 'filename', p.filename);
                patch(plugin, 'description', p.description);
                mockPlugins[i] = plugin;
                mockPlugins[p.name] = plugin;
            });
            patch(mockPlugins, 'length', pluginList.length);
            patch(navigator, 'plugins', mockPlugins);

            const mockMimeTypes = Object.create(MimeTypeArray.prototype);
            mimeTypeList.forEach((m, i) => {
                const mimeType = Object.create(MimeType.prototype);
                patch(mimeType, 'type', m.type);
                patch(mimeType, 'suffixes', m.suffixes);
                patch(mimeType, 'description', m.description);
                patch(mimeType, 'enabledPlugin', mockPlugins[0]);
                mockMimeTypes[i] = mimeType;
                mockMimeTypes[m.type] = mimeType;
            });
            patch(mockMimeTypes, 'length', mimeTypeList.length);
            patch(navigator, 'mimeTypes', mockMimeTypes);
        } catch (e) {}

        // 3. Permissions Alignment
        try {
            const origQuery = navigator.permissions.query;
            navigator.permissions.query = (desc) => {
                if (desc.name === 'notifications' || desc.name === 'geolocation' || desc.name === 'push') {
                    return Promise.resolve({ 
                        name: desc.name,
                        state: 'prompt', 
                        onchange: null,
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        dispatchEvent: () => false
                    });
                }
                return origQuery.apply(navigator.permissions, [desc]);
            };
        } catch (e) {}

        // 4. Chrome API Mocking
        try {
            if (!window.chrome) {
                const now = Date.now();
                window.chrome = {
                    runtime: {
                        OnInstalledReason: { INSTALL: "install", UPDATE: "update", CHROME_UPDATE: "chrome_update", SHARED_MODULE_UPDATE: "shared_module_update" },
                        OnRestartRequiredReason: { APP_UPDATE: "app_update", OS_UPDATE: "os_update", PERIODIC: "periodic" },
                        PlatformArch: { ARM: "arm", ARM64: "arm64", X86_32: "x86-32", X86_64: "x86-64" },
                        PlatformNaclArch: { ARM: "arm", MIPS: "mips", MIPS64: "mips64", X86_32: "x86-32", X86_64: "x86-64" },
                        PlatformOs: { ANDROID: "android", CROS: "cros", LINUX: "linux", MAC: "mac", OPENBSD: "openbsd", WIN: "win" },
                        id: "kpkfofihobmeemebjndfbndneakndcre",
                        sendMessage: () => {},
                        connect: () => ({ onMessage: { addListener: () => {} }, onDisconnect: { addListener: () => {} }, postMessage: () => {} })
                    },
                    app: { isInstalled: false, getDetails: () => null, getIsInstalled: () => false, installState: () => {} },
                    csi: () => ({ startE: now - 100, onloadT: now, pageT: 100, tran: 15 }),
                    loadTimes: () => ({ 
                        requestTime: now/1000 - 0.5, 
                        startLoadTime: now/1000 - 0.5, 
                        commitLoadTime: now/1000 - 0.4, 
                        finishDocumentLoadTime: now/1000 - 0.1, 
                        finishLoadTime: now/1000, 
                        firstPaintTime: now/1000 - 0.3, 
                        firstPaintAfterLoadTime: 0, 
                        navigationType: "Other", 
                        wasFetchedViaSpdy: true, 
                        wasNpnNegotiated: true, 
                        wasAlternateProtocolAvailable: false, 
                        connectionInfo: "h2" 
                    })
                };
            }
        } catch (e) {}

        // 5. WebGL Consistency
        if (fp.webgl) {
            try {
                const originalGetContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function (type) {
                    const ctx = originalGetContext.apply(this, arguments);
                    if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
                         const originalGetParam = ctx.getParameter;
                         ctx.getParameter = function(param) {
                             if (param === 37445) return fp.webgl.vendor;
                             if (param === 37446) return fp.webgl.renderer;
                             if (param === 7936) return "WebKit";
                             if (param === 7937) return "WebKit WebGL";
                             return originalGetParam.apply(this, arguments);
                         };
                    }
                    return ctx;
                };
            } catch (e) {}
        }

        // 6. Stable Canvas Noise
        try {
            const noiseX = Math.floor(rand() * 10);
            const noiseY = Math.floor(rand() * 10);
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function() {
                const ctx = this.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.001)";
                    ctx.fillRect(noiseX, noiseY, 1, 1);
                }
                return originalToDataURL.apply(this, arguments);
            }
        } catch (e) {}
    })(${fpString});
    `;

  await context.addInitScript(scriptContent);
}

/**
 * Cleanup proxy bridge for a session
 */
async function cleanupProxyBridge(sessionId: string): Promise<void> {
  const bridgeUrl = proxyBridges.get(sessionId);
  if (bridgeUrl) {
    try {
      await ProxyChain.closeAnonymizedProxy(bridgeUrl, true);
      proxyBridges.delete(sessionId);
      console.log(`Proxy bridge closed for session: ${sessionId}`);
    } catch (e) {
      console.warn(
        `Failed to close proxy bridge for ${sessionId}:`,
        (e as Error).message,
      );
    }
  }
}

/**
 * Generate responsive HTML for the session information portal
 */
function generateSessionInfoHtml(
  sessionId: string,
  fingerprint: any,
  session: any,
  proxy: any,
): string {
  const proxyInfo =
    proxy &&
    (proxy.server ||
      (proxy.host && proxy.port ? `${proxy.host}:${proxy.port}` : null));
  const proxyAuth =
    proxy && proxy.username
      ? `${proxy.username}:${proxy.password ? "••••" : ""}`
      : null;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRXY Session Portal</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0f;
            color: #ffffff;
            min-height: 100vh;
            overflow-x: hidden;
            overflow-y: auto;
            position: relative;
        }
        
        .bg-grid {
            position: fixed;
            inset: 0;
            background-image: 
                linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
            background-size: 60px 60px;
            z-index: 0;
        }
        
        .bg-glow {
            position: fixed;
            width: 600px;
            height: 600px;
            border-radius: 50%;
            filter: blur(120px);
            opacity: 0.4;
            z-index: 0;
        }
        
        .bg-glow-1 {
            top: -200px;
            left: -200px;
            background: radial-gradient(circle, #6366f1 0%, transparent 70%);
            animation: float 8s ease-in-out infinite;
        }
        
        .bg-glow-2 {
            bottom: -200px;
            right: -200px;
            background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
            animation: float 10s ease-in-out infinite reverse;
        }
        
        .container {
            position: relative;
            z-index: 10;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px;
        }
        
        .card {
            background: linear-gradient(135deg, rgba(17, 17, 27, 0.9) 0%, rgba(26, 26, 46, 0.8) 100%);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 24px;
            padding: 48px;
            max-width: 680px;
            width: 100%;
            backdrop-filter: blur(20px);
            box-shadow: 
                0 0 0 1px rgba(255, 255, 255, 0.05),
                0 25px 50px -12px rgba(0, 0, 0, 0.5),
                0 0 100px -20px rgba(99, 102, 241, 0.3);
        }
        
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        
        .brand {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .logo {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            background-size: 200% 200%;
            animation: gradientShift 4s ease infinite;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -1px;
            box-shadow: 0 10px 40px -10px rgba(99, 102, 241, 0.5);
        }
        
        .brand-text h1 {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }
        
        .brand-text span {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .status-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%);
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 10px 18px;
            border-radius: 100px;
        }
        
        .status-dot {
            width: 10px;
            height: 10px;
            background: #22c55e;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
        }
        
        .status-text {
            font-size: 13px;
            font-weight: 600;
            color: #22c55e;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section-title {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .section-title h2 {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .section-line {
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.3) 0%, transparent 100%);
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 32px;
        }
        
        .info-card {
            background: rgba(15, 15, 25, 0.6);
            border: 1px solid rgba(99, 102, 241, 0.1);
            border-radius: 16px;
            padding: 20px;
            transition: all 0.3s ease;
        }
        
        .info-card:hover {
            border-color: rgba(99, 102, 241, 0.3);
            transform: translateY(-2px);
            box-shadow: 0 10px 40px -15px rgba(99, 102, 241, 0.2);
        }
        
        .info-card.full-width {
            grid-column: span 2;
        }
        
        .info-icon {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 12px;
            font-size: 16px;
        }
        
        .info-label {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 6px;
        }
        
        .info-value {
            font-size: 14px;
            font-weight: 500;
            color: #e2e8f0;
            font-family: 'JetBrains Mono', monospace;
            word-break: break-all;
            line-height: 1.5;
        }
        
        .info-value.truncate {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .proxy-section {
            background: linear-gradient(135deg, rgba(15, 15, 25, 0.8) 0%, rgba(20, 20, 35, 0.6) 100%);
            border: 1px solid rgba(99, 102, 241, 0.15);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .proxy-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
        }
        
        .proxy-title {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .proxy-title .icon {
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }
        
        .proxy-title h3 {
            font-size: 16px;
            font-weight: 700;
            color: #fff;
        }
        
        .proxy-title span {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
        }
        
        .health-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            color: #fff;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px -5px rgba(99, 102, 241, 0.5);
        }
        
        .health-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px -5px rgba(99, 102, 241, 0.6);
        }
        
        .health-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }
        
        .health-btn .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            display: none;
        }
        
        .health-btn.loading .spinner {
            display: block;
        }
        
        .health-btn.loading .btn-text {
            display: none;
        }
        
        .proxy-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        }
        
        .stat-card {
            background: rgba(10, 10, 15, 0.5);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 20px;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
            margin-bottom: 4px;
        }
        
        .stat-value.success { color: #22c55e; }
        .stat-value.warning { color: #f59e0b; }
        .stat-value.error { color: #ef4444; }
        .stat-value.pending { color: #64748b; }
        
        .stat-label {
            font-size: 10px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .no-proxy {
            text-align: center;
            padding: 20px;
            color: #64748b;
            font-size: 14px;
        }
        
        .footer {
            text-align: center;
            padding-top: 24px;
            border-top: 1px solid rgba(99, 102, 241, 0.1);
        }
        
        .footer p {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 16px;
        }
        
        .quick-links {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .quick-link {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(99, 102, 241, 0.1);
            border: 1px solid rgba(99, 102, 241, 0.2);
            padding: 10px 20px;
            border-radius: 10px;
            color: #a5b4fc;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .quick-link:hover {
            background: rgba(99, 102, 241, 0.2);
            border-color: rgba(99, 102, 241, 0.4);
            transform: translateY(-2px);
        }

        /* Responsive Styles */
        @media (max-width: 640px) {
            .container {
                padding: 16px;
            }
            .card {
                padding: 24px;
                border-radius: 16px;
            }
            .header {
                flex-direction: column;
                align-items: flex-start;
                gap: 20px;
            }
            .info-grid {
                grid-template-columns: 1fr;
            }
            .info-card.full-width {
                grid-column: span 1;
            }
            .proxy-stats {
                grid-template-columns: 1fr;
            }
            .brand-text h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="bg-grid"></div>
    <div class="bg-glow bg-glow-1"></div>
    <div class="bg-glow bg-glow-2"></div>
    
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="brand">
                    <div class="logo">P</div>
                    <div class="brand-text">
                        <span>Browser Engine</span>
                        <h1>PRXY Session</h1>
                    </div>
                </div>
                <div class="status-badge">
                    <div class="status-dot"></div>
                    <span class="status-text">${session?.email || "Active"}</span>
                </div>
            </div>
            
            <div class="section-title">
                <h2>Session Details</h2>
                <div class="section-line"></div>
            </div>
            
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-icon">📧</div>
                    <div class="info-label">Account</div>
                    <div class="info-value truncate" title="${session?.email || "N/A"}">${session?.email || "N/A"}</div>
                </div>
                <div class="info-card">
                    <div class="info-icon">🔑</div>
                    <div class="info-label">Session ID</div>
                    <div class="info-value">${sessionId.slice(0, 8)}...${sessionId.slice(-4)}</div>
                </div>
                <div class="info-card">
                    <div class="info-icon">🌍</div>
                    <div class="info-label">Timezone</div>
                    <div class="info-value">${fingerprint?.timezoneId || "System Default"}</div>
                </div>
                <div class="info-card">
                    <div class="info-icon">📐</div>
                    <div class="info-label">Viewport</div>
                    <div class="info-value">${fingerprint?.viewport ? fingerprint.viewport.width + " × " + fingerprint.viewport.height : "Default"}</div>
                </div>
                <div class="info-card">
                    <div class="info-icon">📱</div>
                    <div class="info-label">Device Type</div>
                    <div class="info-value">${fingerprint?.isMobile ? "Mobile" : "Desktop"}</div>
                </div>
                <div class="info-card full-width">
                    <div class="info-icon">🌐</div>
                    <div class="info-label">User Agent</div>
                    <div class="info-value truncate" title="${fingerprint?.userAgent || "Default"}">${fingerprint?.userAgent || "Default"}</div>
                </div>
            </div>
            
            <div class="proxy-section">
                <div class="proxy-header">
                    <div class="proxy-title">
                        <div class="icon">🛡️</div>
                        <div>
                            <h3>Proxy Connection</h3>
                            <span>${proxyInfo || "No proxy configured"}</span>
                            ${proxyAuth ? `<span style="font-size: 11px; color: #6366f1; opacity: 0.8; display: block; margin-top: 4px;">Auth: ${proxyAuth}</span>` : ""}
                        </div>
                    </div>
                    ${
                      proxyInfo
                        ? `
                    <button class="health-btn" onclick="checkProxyHealth()">
                        <div class="spinner"></div>
                        <span class="btn-text">Check Health</span>
                    </button>
                    `
                        : ""
                    }
                </div>
                
                ${
                  proxyInfo
                    ? `
                <div class="proxy-stats">
                    <div class="stat-card">
                        <div class="stat-value pending" id="proxy-status">—</div>
                        <div class="stat-label">Status</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value pending" id="proxy-latency">—</div>
                        <div class="stat-label">Latency</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value pending" id="proxy-ip">—</div>
                        <div class="stat-label">External IP</div>
                    </div>
                </div>
                `
                    : `
                <div class="no-proxy">
                    <p>Direct connection mode - no proxy configured for this session</p>
                </div>
                `
                }
            </div>
            
            <div class="footer">
                <p>Navigate to any website to begin your session</p>
                <div class="quick-links">
                    <a class="quick-link" href="https://google.com" target="_blank">🔍 Google</a>
                    <a class="quick-link" href="https://browserleaks.com/ip" target="_blank">🕵️ IP Check</a>
                    <a class="quick-link" href="https://bot.sannysoft.com" target="_blank">🤖 Bot Test</a>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        async function checkProxyHealth() {
            const btn = document.querySelector('.health-btn');
            const statusEl = document.getElementById('proxy-status');
            const latencyEl = document.getElementById('proxy-latency');
            const ipEl = document.getElementById('proxy-ip');
            
            btn.classList.add('loading');
            btn.disabled = true;
            
            statusEl.textContent = '...';
            latencyEl.textContent = '...';
            ipEl.textContent = '...';
            
            const startTime = Date.now();
            
            try {
                const response = await fetch('https://api.ipify.org?format=json', {
                    timeout: 10000
                });
                const latency = Date.now() - startTime;
                
                if (response.ok) {
                    const data = await response.json();
                    statusEl.textContent = 'OK';
                    statusEl.className = 'stat-value success';
                    latencyEl.textContent = latency + 'ms';
                    latencyEl.className = latency < 500 ? 'stat-value success' : latency < 1500 ? 'stat-value warning' : 'stat-value error';
                    ipEl.textContent = data.ip;
                    ipEl.className = 'stat-value success';
                } else {
                    throw new Error('Failed');
                }
            } catch (err) {
                statusEl.textContent = 'FAIL';
                statusEl.className = 'stat-value error';
                latencyEl.textContent = 'N/A';
                latencyEl.className = 'stat-value error';
                ipEl.textContent = 'N/A';
                ipEl.className = 'stat-value error';
            }
            
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    </script>
</body>
</html>`;
}

/**
 * Launch a local headful browser
 */
ipcMain.handle(
  "playwright:launchLocal",
  async (event, { sessionId, storageState, proxy, fingerprint, session }) => {
    try {
      // Check if already open and reuse if possible
      const existingConnection = connectedBrowsers.get(sessionId);
      if (existingConnection) {
        console.log(
          `[Main] Reusing existing browser for session: ${sessionId}`,
        );
        try {
          // Focus the last page used or the session info page
          await existingConnection.page.bringToFront();
          return { success: true, message: "Reused existing browser instance" };
        } catch (e) {
          console.log(
            `[Main] Existing browser for ${sessionId} seems dead, launching new one.`,
          );
          connectedBrowsers.delete(sessionId);
          await cleanupProxyBridge(sessionId);
        }
      }

      console.log(`Launching local browser for session: ${sessionId}`);
      console.log(`UserAgent to apply: ${fingerprint?.userAgent}`);
      console.log(`Proxy data received:`, JSON.stringify(proxy, null, 2));

      // Prepare proxy (returns object with server, username, password)
      const proxyConfig = await prepareProxy(sessionId, proxy);

      const browser = await chromium.launch({
        headless: false,
        args: ["--disable-blink-features=AutomationControlled"],
      });

      // Listen for browser disconnection (user closes browser directly)
      browser.on("disconnected", async () => {
        console.log(`Browser disconnected for session: ${sessionId}`);
        connectedBrowsers.delete(sessionId);
        // Cleanup proxy bridge
        await cleanupProxyBridge(sessionId);
        // Notify renderer that browser was closed
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("playwright:browserClosed", {
            sessionId,
          });
        }
      });

      const context = await browser.newContext({
        storageState: storageState,
        // Use the proxy object (bridge or native auth)
        proxy: proxyConfig,
        userAgent: fingerprint?.userAgent,
        timezoneId: fingerprint?.timezoneId,
        viewport: fingerprint?.viewport,
        screen: fingerprint?.screen,
        deviceScaleFactor: fingerprint?.deviceScaleFactor,
        isMobile: fingerprint?.isMobile,
        hasTouch: fingerprint?.hasTouch,
        locale: fingerprint?.language || "en-US",
        geolocation: fingerprint?.geolocation,
        permissions: ["geolocation"],
        bypassCSP: true,
        ignoreHTTPSErrors: true,
      });

      // Inject advanced fingerprinting fixes
      await injectFingerprint(context, {
        ...fingerprint,
        sessionId: sessionId,
      });

      const page = await context.newPage();

      // Show session information page
      const sessionInfoHtml = generateSessionInfoHtml(
        sessionId,
        fingerprint,
        session,
        proxy,
      );
      await page.setContent(sessionInfoHtml);

      // Store the connection
      connectedBrowsers.set(sessionId, { browser, context, page });

      return { success: true, message: "Local browser launched" };
    } catch (error) {
      console.error("Failed to launch local browser:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Launch failed",
      };
    }
  },
);

/**
 * Show the session Portal (navigates back to the info page)
 */
ipcMain.handle(
  "playwright:showPortal",
  async (event, { sessionId, fingerprint, session, proxy }) => {
    try {
      const connection = connectedBrowsers.get(sessionId);
      if (!connection) {
        return { success: false, error: "No active connection" };
      }

      const sessionInfoHtml = generateSessionInfoHtml(
        sessionId,
        fingerprint,
        session,
        proxy,
      );
      await connection.page.setContent(sessionInfoHtml);
      await connection.page.bringToFront();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to show portal",
      };
    }
  },
);

/**
 * Bring the page to front
 */
ipcMain.handle("playwright:bringToFront", async (event, { sessionId }) => {
  try {
    const connection = connectedBrowsers.get(sessionId);
    if (!connection) {
      return { success: false, error: "No active connection" };
    }

    await connection.page.bringToFront();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to bring to front",
    };
  }
});

/**
 * List active connections
 */
ipcMain.handle("playwright:listConnections", async () => {
  return {
    success: true,
    sessions: Array.from(connectedBrowsers.keys()),
  };
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  initAutoUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", async () => {
  // Clean up all browser connections
  for (const [sessionId, connection] of connectedBrowsers) {
    try {
      await connection.browser.close();
    } catch (e) {
      console.error(`Error closing browser for ${sessionId}:`, e);
    }
  }
  connectedBrowsers.clear();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle external links
app.on("web-contents-created", (event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});
