/**
 * Electron Main Process
 * Manages the application window and Playwright browser connections
 */

import { app, BrowserWindow, ipcMain, shell } from "electron";
import * as path from "path";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { chromium } from "playwright-core"; // We'll keep this but the require in BrowserManager is the one that matters for path
import * as ProxyChain from "proxy-chain";
import { initAutoUpdater } from "./auto-updater";
import { BrowserManager } from "./browser-manager";
import "./env";

// Keep a global reference of the window object
let mainWindow: BrowserWindow | null = null;

// Store for connected browsers
const connectedBrowsers: Map<
  string,
  { browser: Browser; context: BrowserContext; page: Page }
> = new Map();

// Store for proxy bridges (authenticated proxy tunnels)
const proxyBridges: Map<string, string> = new Map();

// Browser session status tracking (launching → open → closed)
const browserSessionStatuses: Map<string, string> = new Map();

function emitBrowserStatus(sessionId: string, status: string) {
  console.log(`[Main] emitBrowserStatus: ${sessionId} → ${status}`);
  if (status === "closed") {
    browserSessionStatuses.delete(sessionId);
  } else {
    browserSessionStatuses.set(sessionId, status);
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    console.log(`[Main] Sending browserStatusChanged IPC to renderer`);
    mainWindow.webContents.send("playwright:browserStatusChanged", {
      sessionId,
      status,
    });
  } else {
    console.warn(`[Main] mainWindow not available, cannot send status event`);
  }
}

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
      browser.on("disconnected", async () => {
        console.log(`Remote browser disconnected for session: ${sessionId}`);
        connectedBrowsers.delete(sessionId);
        // Notify UI immediately, before slow cleanup
        emitBrowserStatus(sessionId, "closed");
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
    emitBrowserStatus(sessionId, "closed");
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
 * Based on be-prxyauth FingerprintInjector for maximum stealth
 */
async function injectFingerprint(context: any, fp: any): Promise<void> {
  if (!fp) return;

  const fpString = JSON.stringify(fp);
  const scriptContent = `
    (function(fp) {
        const seed = fp.sessionId || fp.seed || 'default';
        
        // Advanced PRNG to get stable noise per session (cyrb128 + mulberry32)
        const cyrb128 = (str) => {
            let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
            for (let i = 0, k; i < str.length; i++) {
                k = str.charCodeAt(i);
                h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
                h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
                h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
                h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
            }
            h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
            h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
            h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
            h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
            return [(h1 === 0 ? 1 : h1) >>> 0, (h2 === 0 ? 1 : h2) >>> 0, (h3 === 0 ? 1 : h3) >>> 0, (h4 === 0 ? 1 : h4) >>> 0];
        };
        
        const mulberry32 = (a) => () => {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
        
        const hashes = cyrb128(seed);
        const rand = mulberry32(hashes[0]);

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
        patch(navigator, 'maxTouchPoints', fp.maxTouchPoints || 0);
        patch(navigator, 'userAgent', fp.userAgent);
        patch(navigator, 'appVersion', fp.userAgent.replace("Mozilla/", ""));
        patch(navigator, 'vendor', 'Google Inc.');
        patch(navigator, 'appName', 'Netscape');
        patch(navigator, 'language', fp.language || 'en-US');
        patch(navigator, 'languages', [fp.language || 'en-US', (fp.language || 'en-US').split("-")[0]]);
        
        // Match platform to UA
        let platform = fp.platform || fp.legacyPlatform;
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
        
        // Webdriver bypass (hardened)
        try {
            const newProto = Object.getPrototypeOf(navigator);
            const getter = () => false;
            Object.defineProperty(getter, 'name', { value: 'get webdriver', configurable: true });
            Object.defineProperty(getter, 'toString', { value: () => 'function get webdriver() { [native code] }', configurable: true });
            
            Object.defineProperty(newProto, 'webdriver', {
                get: getter,
                enumerable: true,
                configurable: true
            });
        } catch (e) {}

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

        // 3. Screen Alignment
        if (fp.screen) {
            const screenProps = ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'];
            screenProps.forEach(prop => patch(screen, prop, fp.screen[prop]));
        }

        // 4. Permissions Alignment
        try {
            const origQuery = navigator.permissions.query;
            navigator.permissions.query = (desc) => {
                if (desc.name === 'notifications' || desc.name === 'geolocation' || desc.name === 'push') {
                    return Promise.resolve({ 
                        name: desc.name,
                        state: desc.name === 'geolocation' ? 'granted' : 'prompt', 
                        onchange: null,
                        addEventListener: () => {},
                        removeEventListener: () => {},
                        dispatchEvent: () => false
                    });
                }
                return origQuery.apply(navigator.permissions, [desc]);
            };
        } catch (e) {}

        // 5. Chrome API Mocking
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

        // 6. WebGL Consistency
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

        // 7. Stable Canvas Noise
        try {
            const noiseX = Math.floor(rand() * 10);
            const noiseY = Math.floor(rand() * 10);
            const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
            HTMLCanvasElement.prototype.toDataURL = function() {
                const ctx = this.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = "rgba(255, 255, 255, 0.01)";
                    ctx.fillRect(noiseX, noiseY, 1, 1);
                }
                return originalToDataURL.apply(this, arguments);
            }
            
            const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
            CanvasRenderingContext2D.prototype.getImageData = function () {
                const res = originalGetImageData.apply(this, arguments);
                res.data[noiseX % 4] ^= 1;
                return res;
            };
        } catch (e) {}

        // 8. Audio Noise
        try {
            const originalGetChannelData = AudioBuffer.prototype.getChannelData;
            AudioBuffer.prototype.getChannelData = function () {
                const data = originalGetChannelData.apply(this, arguments);
                data[0] += (rand() * 0.00000001);
                return data;
            };
        } catch (e) {}

        // 9. FIDO & Credentials Bypass (look like real browser without passkeys)
        try {
            if (window.PublicKeyCredential) {
                window.PublicKeyCredential.isConditionalMediationAvailable = () => Promise.resolve(false);
                window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
            }

            if (navigator.credentials) {
                if (navigator.credentials.create) {
                    const origCreate = navigator.credentials.create;
                    navigator.credentials.create = function (options) {
                        if (options && options.publicKey) {
                            return Promise.reject(new DOMException("The operation is not supported.", "NotSupportedError"));
                        }
                        return origCreate.apply(this, arguments);
                    };
                }

                if (navigator.credentials.get) {
                    const origGet = navigator.credentials.get;
                    navigator.credentials.get = function (...args) {
                        const options = args[0];
                        if (options && options.publicKey) {
                            return Promise.reject(new DOMException("User cancelled the operation", "NotAllowedError"));
                        }
                        return origGet.apply(this, args);
                    };
                }
            }
        } catch (e) {}

        // 10. WebRTC IP Masking (Prevent real IP leak through RTC candidates)
        try {
            const OriginalRTCPeerConnection = window.RTCPeerConnection;
            
            if (OriginalRTCPeerConnection && fp.proxyIp) {
                window.RTCPeerConnection = function(config) {
                    const pc = new OriginalRTCPeerConnection(config);
                    const originalAddIceCandidate = pc.addIceCandidate.bind(pc);
                    
                    pc.addIceCandidate = function(candidate) {
                        if (candidate && candidate.candidate) {
                            const maskedCandidate = candidate.candidate.replace(/((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g, fp.proxyIp);
                            return originalAddIceCandidate({ ...candidate, candidate: maskedCandidate });
                        }
                        return originalAddIceCandidate(candidate);
                    };
                    
                    const originalOnIceCandidate = Object.getOwnPropertyDescriptor(RTCPeerConnection.prototype, 'onicecandidate');
                    Object.defineProperty(pc, 'onicecandidate', {
                        set: function(fn) {
                            const wrappedFn = function(event) {
                                if (event.candidate && event.candidate.candidate) {
                                    const maskedCandidate = event.candidate.candidate.replace(/((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g, fp.proxyIp);
                                    event = { ...event, candidate: { ...event.candidate, candidate: maskedCandidate } };
                                }
                                return fn.apply(this, [event]);
                            };
                            return originalOnIceCandidate.set.apply(this, [wrappedFn]);
                        }
                    });

                    return pc;
                };
                window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
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
 * Launch a local headful browser
 */
ipcMain.handle(
  "playwright:launchLocal",
  async (event, { sessionId, storageState, proxy, fingerprint, session, frontendUrl }) => {
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
        connectedBrowsers.delete(sessionId);
        // Notify UI immediately, before slow cleanup
        emitBrowserStatus(sessionId, "closed");
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("playwright:browserClosed", {
            sessionId,
          });
        }
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
        bypassCSP: true,
        ignoreHTTPSErrors: true,
      });

      // Override default new tab behavior to visit Google.com
      let isFirstPage = true;
      context.on("page", async (newPage) => {
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
          } catch (e) {
            // Ignore if closed or navigation fails
          }
        };

        handleNewTab();
        newPage.on("domcontentloaded", handleNewTab);
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
      connectedBrowsers.set(sessionId, { browser, context, page });
      emitBrowserStatus(sessionId, "open");

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
  async (event, { sessionId, fingerprint, session, proxy, frontendUrl }) => {
    try {
      const connection = connectedBrowsers.get(sessionId);
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
  // Validate liveness of all tracked browsers
  const liveSessions: string[] = [];
  const deadSessions: string[] = [];

  for (const [sessionId, connection] of connectedBrowsers) {
    try {
      if (connection.browser.isConnected()) {
        liveSessions.push(sessionId);
      } else {
        deadSessions.push(sessionId);
      }
    } catch {
      deadSessions.push(sessionId);
    }
  }

  // Clean up stale entries discovered during heartbeat
  for (const sessionId of deadSessions) {
    console.log(
      `[Main] Heartbeat cleanup: stale browser for session ${sessionId}`,
    );
    connectedBrowsers.delete(sessionId);
    emitBrowserStatus(sessionId, "closed");
    cleanupProxyBridge(sessionId);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("playwright:browserClosed", { sessionId });
    }
  }

  return {
    success: true,
    sessions: liveSessions,
    statuses: Object.fromEntries(browserSessionStatuses),
  };
});

// App lifecycle
app.whenReady().then(async () => {
  createWindow();

  // Initialize auto-updater with window reference for progress display
  initAutoUpdater(mainWindow);

  // Initialize and ensure Playwright browser is installed (production and dev)
  const browserManager = BrowserManager.getInstance();
  await browserManager.ensureInstalled(mainWindow);

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
