/**
 * IPC surface for node provisioning. Transport only.
 *
 * The renderer supplies its session token + the backend URL it already
 * uses (both live in renderer localStorage); the main process performs
 * registration, .env management and runtime start. Key material never
 * crosses the bridge.
 */

import { ipcMain } from "electron";
import {
    isProvisioned,
    provisionNode,
    type ProvisioningResult,
} from "../services/node-provisioning";

interface ApiResult<T = unknown> {
    success: boolean;
    error?: string;
    message?: string;
    data?: T;
}

interface ProvisionRequest {
    backendUrl: string;
    token: string;
    nodeName?: string;
    existingNodeKey?: string;
}

export function registerNodeProvisioningIpc(): void {
    ipcMain.handle(
        "node-provisioning:status",
        (): ApiResult<{ provisioned: boolean }> => ({
            success: true,
            data: { provisioned: isProvisioned() },
        }),
    );

    ipcMain.handle(
        "node-provisioning:enable",
        async (_event, req: ProvisionRequest): Promise<ApiResult> => {
            if (!req?.backendUrl || !req?.token) {
                return { success: false, error: "Missing backend URL or session token." };
            }
            const hostname = require("os").hostname();
            const result: ProvisioningResult = await provisionNode({
                backendUrl: req.backendUrl.replace(/\/+$/, ""),
                token: req.token,
                nodeName: req.nodeName?.trim() || `${hostname} (desktop)`,
                existingNodeKey: req.existingNodeKey,
            });
            if (result.success) {
                return { success: true, message: "Node provisioned and running." };
            }
            return {
                success: false,
                error: result.error,
                message: result.licenseRequired
                    ? "license-required"
                    : result.limitReached
                      ? "limit-reached"
                      : undefined,
            };
        },
    );
}