/**
 * Proxy bridge service — authenticated proxy tunneling per session.
 *
 * proxy-chain anonymizes credential-bearing proxies into local bridge
 * URLs Playwright can consume; bridges are tracked per session and must
 * be closed when the session's browser goes away.
 */

import * as ProxyChain from "proxy-chain";

export interface ProxyInput {
    host?: string;
    port?: string;
    server?: string;
    username?: string;
    password?: string;
    /** Resolved egress IP, surfaced to the fingerprint for consistency checks. */
    externalIp?: string;
}

export interface PreparedProxy {
    server: string;
    username?: string;
    password?: string;
}

const proxyBridges: Map<string, string> = new Map();

/**
 * Prepare proxy configuration with normalization and optional bridge.
 * Creates an anonymized proxy bridge to handle authenticated proxies;
 * falls back to native credential auth if bridging fails.
 */
export async function prepareProxy(
    sessionId: string,
    proxy?: ProxyInput,
): Promise<PreparedProxy | undefined> {
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
        } catch {
            /* fall through to raw URL */
        }
    }

    try {
        const maskedUrl = authenticatedUrl.replace(/:[^:@]+@/, ":****@");
        console.log(`[Proxy] Creating bridge for session ${sessionId}: ${maskedUrl}`);

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

/** Close (and forget) a session's bridge, if any. */
export async function cleanupProxyBridge(sessionId: string): Promise<void> {
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