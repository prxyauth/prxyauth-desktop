/**
 * IPC surface for the embedded node runtime. Transport only: validate
 * and delegate to services/node-runtime.ts. The renderer's "Self-Hosted
 * Node" section consumes these channels (phase 2).
 */

import { ipcMain } from "electron";
import {
    getNodeRuntimeService,
    isNodeRuntimeInstalled,
    type NodeRuntimeInfo,
} from "../services/node-runtime";

/** Matches the ApiResult shape the preload exposes (success/error/data). */
interface ApiResult<T = unknown> {
    success: boolean;
    error?: string;
    message?: string;
    data?: T;
}

export function registerNodeRuntimeIpc(): void {
    const runtime = getNodeRuntimeService();

    ipcMain.handle("node-runtime:get-info", (): ApiResult<NodeRuntimeInfo> => ({
        success: true,
        data: runtime.getInfo(),
    }));

    ipcMain.handle("node-runtime:is-installed", (): ApiResult<NodeRuntimeInfo> => ({
        success: true,
        data: {
            ...runtime.getInfo(),
            status: isNodeRuntimeInstalled() ? "stopped" : "not-installed",
        },
    }));

    ipcMain.handle("node-runtime:start", async (): Promise<ApiResult<NodeRuntimeInfo>> => {
        try {
            const result = await runtime.start();
            return {
                success: result.started,
                error: result.error,
                data: runtime.getInfo(),
            };
        } catch (err) {
            return { success: false, error: String(err), data: runtime.getInfo() };
        }
    });

    ipcMain.handle("node-runtime:stop", async (): Promise<ApiResult<NodeRuntimeInfo>> => {
        try {
            await runtime.stop();
            return { success: true, data: runtime.getInfo() };
        } catch (err) {
            return { success: false, error: String(err), data: runtime.getInfo() };
        }
    });
}