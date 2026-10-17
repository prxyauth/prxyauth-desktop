/**
 * Node provisioning service — the one-click self-hosted onboarding.
 *
 * The renderer supplies its session token + the backend URL it already
 * uses (both live in renderer localStorage); the main process registers
 * the node against the backend (one-time nodeKey mint), persists the
 * key to <userData>/node-agent.json, and starts the agent.
 *
 * Security posture:
 * - The nodeKey is a one-time secret shown once by the backend; it goes
 *   straight into node-agent.json and never crosses the renderer bridge.
 * - No .env, no child process, no ENCRYPTION_KEY — the native agent has
 *   no secrets to encrypt (no DB, no password storage).
 * - Re-provisioning with an explicit existing key preserves it.
 */

import {
    getNodeAgent,
    readAgentConfig,
    writeAgentConfig,
} from "../node/node-agent";

export interface ProvisioningResult {
    success: boolean;
    step?: "register" | "write-config" | "start";
    error?: string;
    /** 402 = SELFHOSTED license missing (sell it in the Marketplace) */
    licenseRequired?: boolean;
    /** 409 = node quota reached (revoke one first) */
    limitReached?: boolean;
}

export interface ProvisioningConfig {
    /** Backend base URL, e.g. https://api.prxyauth.com (no trailing slash). */
    backendUrl: string;
    /** Session JWT for the logged-in user. */
    token: string;
    /** Node display name. */
    nodeName: string;
    /** Optional existing node key (re-provisioning on a migrated install). */
    existingNodeKey?: string;
}

/** Does the agent already have a config (previously provisioned)? */
export function isProvisioned(): boolean {
    return readAgentConfig() !== null;
}

/**
 * Full onboarding: register node → persist config → start agent.
 * If already provisioned without an explicit existing key, just start.
 */
export async function provisionNode(config: ProvisioningConfig): Promise<ProvisioningResult> {
    const agent = getNodeAgent();
    const existing = readAgentConfig();

    // Already provisioned → just start.
    if (existing && !config.existingNodeKey) {
        const started = agent.start();
        return started.started
            ? { success: true }
            : { success: false, step: "start", error: started.error };
    }

    // Step 1: register the node against the backend (one-time nodeKey mint).
    let nodeKey: string;
    if (config.existingNodeKey) {
        nodeKey = config.existingNodeKey;
    } else {
        try {
            const res = await fetch(`${config.backendUrl}/api/selfhosted/nodes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${config.token}`,
                },
                body: JSON.stringify({ name: config.nodeName }),
                signal: AbortSignal.timeout(15_000),
            });
            if (res.status === 402) {
                return {
                    success: false,
                    step: "register",
                    licenseRequired: true,
                    error: "Self-Hosted license required — purchase it in the Marketplace.",
                };
            }
            if (res.status === 409) {
                return {
                    success: false,
                    step: "register",
                    limitReached: true,
                    error: "Node limit reached — revoke an existing node first.",
                };
            }
            if (!res.ok) {
                return {
                    success: false,
                    step: "register",
                    error: `Backend rejected node registration (${res.status}).`,
                };
            }
            const body = (await res.json()) as {
                success: boolean;
                data?: { nodeKey?: string; node?: { id?: string } };
                error?: string;
            };
            if (!body.success || !body.data?.nodeKey) {
                return {
                    success: false,
                    step: "register",
                    error: body.error || "Backend returned no node key.",
                };
            }
            nodeKey = body.data.nodeKey;
        } catch (err) {
            return {
                success: false,
                step: "register",
                error: `Could not reach the backend: ${String(err)}`,
            };
        }
    }

    // Step 2: persist the agent config (nodeKey lives ONLY here).
    try {
        writeAgentConfig({
            nodeKey,
            backendUrl: config.backendUrl,
            nodeName: config.nodeName,
        });
    } catch (err) {
        return { success: false, step: "write-config", error: String(err) };
    }

    // Step 3: start (or hot-reload config into the agent) and connect.
    if (!agent.applyNewConfig()) {
        return { success: false, step: "start", error: "Agent config could not be reloaded." };
    }
    const started = agent.start();
    if (!started.started) {
        return { success: false, step: "start", error: started.error };
    }

    return { success: true };
}