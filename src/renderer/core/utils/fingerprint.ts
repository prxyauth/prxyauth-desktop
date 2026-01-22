/**
 * Fingerprint Utility
 */

export interface BrowserFingerprint {
    userAgent: string;
    language: string;
    platform: string;
    viewport: {
        width: number;
        height: number;
    };
    screenResolution: {
        width: number;
        height: number;
    };
    colorDepth: number;
    deviceMemory?: number;
    hardwareConcurrency?: number;
    timezone: string;
}

export function getBrowserFingerprint(): BrowserFingerprint {
    return {
        userAgent: navigator.userAgent,
        language: navigator.language,
        // @ts-ignore
        platform: navigator.platform || "unknown",
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
        },
        screenResolution: {
            width: window.screen.width,
            height: window.screen.height,
        },
        colorDepth: window.screen.colorDepth,
        // @ts-ignore
        deviceMemory: navigator.deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
}
