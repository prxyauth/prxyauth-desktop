/**
 * Node provisioning service — the one-click self-hosted onboarding.
 *
 * Replaces the manual flow (dashboard shows NODE_KEY → user downloads a
 * second app → finds .env → pastes NODE_KEY + TUNNEL_URL) with: logged-in
 * user clicks "Enable Self-Hosted Node" → this service registers the node
 * against the backend with the session JWT, writes the embedded node's
 * .env, and starts the runtime.
 *
 * Security posture:
 * - The nodeKey is a one-time secret shown once by the backend; we write
 *   it to the .env and never expose it to the renderer. Renderer only
 *   ever sees provisioning status, never key material.
 * - ENCRYPTION_KEY is generated locally with crypto.randomBytes(32) and
 *   never leaves the machine.
 * - The .env lives in the app's userData/node-runtime/ directory.
 */

import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { app } from "electron";
import { getNodeRuntimeService } from "./node-runtime";

export interface ProvisioningResult {
    success: boolean;
    step?: "register" | "write-env" | "start";
    error?: string;
    /** 402 = SELFHOSTED license missing (sell it in the Marketplace) */
    licenseRequired?: boolean;
    /** 409 = node quota reached (revoke one first) */
    limitReached?: boolean;
    nodeId?: string;
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

/** Required env for the embedded node server to boot (see selfhosted env.schema). */
function buildEnvFile(params: {
    nodeKey: string;
    encryptionKey: string;
    tunnelUrl: string;
    port: number;
}): string {
    const lines = [
        "# Embedded self-hosted node — provisioned by the desktop app",
        `NODE_KEY=${params.nodeKey}`,
        `ENCRYPTION_KEY=${params.encryptionKey}`,
        `TUNNEL_URL=${params.tunnelUrl}`,
        `DATABASE_URL=file:./profiles.db`,
        `PORT=${params.port}`,
        `HOST=127.0.0.1`,
        `NODE_ENV=production`,
    ];
    return lines.join("\n") + "\n";
}

export function getProvisioningDir(): string {
    const dir = path.join(app.getPath("userData"), "node-runtime");
    mkdirSync(dir, { recursive: true });
    return dir;
}

/** Does the embedded node already have a .env (previously provisioned)? */
export function isProvisioned(): boolean {
    return existsSync(path.join(getProvisioningDir(), ".env"));
}

/**
 * Full onboarding: register node → write .env → start runtime.
 * Idempotent-ish: if already provisioned, just (re)starts the runtime.
 */
export async function provisionNode(config: ProvisioningConfig): Promise<ProvisioningResult> {
    const runtime = getNodeRuntimeService();
    const envPath = path.join(getProvisioningDir(), ".env");

    // Already provisioned → just start.
    if (existsSync(envPath) && !config.existingNodeKey) {
        const started = await runtime.start();
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

    // Step 2: write the .env. If one already exists, preserve its
    // ENCRYPTION_KEY — rotating it would make every stored profile secret
    // unreadable — plus any operator-customized keys.
    try {
        const envPathFull = envPath;
        const existing: Record<string, string> = {};
        if (existsSync(envPathFull)) {
            for (const line of readFileSync(envPathFull, "utf-8").split("\n")) {
                const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
                if (m) existing[m[1]] = m[2];
            }
        }
        const encryptionKey =
            existing.ENCRYPTION_KEY || randomBytes(32).toString("hex");
        const tunnelUrl = config.backendUrl.replace(/^http/, "ws") + "/ws/selfhosted";
        const envContent = buildEnvFile({
            nodeKey,
            encryptionKey,
            tunnelUrl,
            port: 4000,
        });
        writeFileSync(envPathFull, envContent, { encoding: "utf-8" });
    } catch (err) {
        return { success: false, step: "write-env", error: String(err) };
    }

    // Step 3: start the runtime.
    const started = await runtime.start();
    if (!started.started) {
        return { success: false, step: "start", error: started.error };
    }

    return { success: true, nodeId: undefined };
}