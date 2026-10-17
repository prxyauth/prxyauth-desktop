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

export interface NodeRuntimeIpcPayload {
    channel: string;
    success: boolean;
    info?: NodeRuntimeInfo;
    error?: string;
}

export function registerNodeRuntimeIpc(): void {
    const runtime = getNodeRuntimeService();

    ipcMain.handle("node-runtime:get-info", (): NodeRuntimeIpcPayload => ({
        channel: "get-info",
        success: true,
        info: runtime.getInfo(),
    }));

    ipcMain.handle("node-runtime:is-installed", (): NodeRuntimeIpcPayload => ({
        channel: "is-installed",
        success: true,
        info: {
            ...runtime.getInfo(),
            status: isNodeRuntimeInstalled() ? "stopped" : "not-installed",
        },
    }));

    ipcMain.handle("node-runtime:start", async (): Promise<NodeRuntimeIpcPayload> => {
        try {
            const result = await runtime.start();
            return {
                channel: "start",
                success: result.started,
                info: runtime.getInfo(),
                error: result.error,
            };
        } catch (err) {
            return {
                channel: "start",
                success: false,
                info: runtime.getInfo(),
                error: String(err),
            };
        }
    });

    ipcMain.handle("node-runtime:stop", async (): Promise<NodeRuntimeIpcPayload> => {
        try {
            await runtime.stop();
            return {
                channel: "stop",
                success: true,
                info: runtime.getInfo(),
            };
        } catch (err) {
            return {
                channel: "stop",
                success: false,
                info: runtime.getInfo(),
                error: String(err),
            };
        }
    });
}