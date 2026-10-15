/**
 * Advanced Fingerprint Injection
 * Synchronizes browser properties with the target identity
 * Based on be-prxyauth FingerprintInjector for maximum stealth
 */

export async function injectFingerprint(context: any, fp: any): Promise<void> {
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
