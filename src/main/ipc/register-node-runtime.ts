/**
 * IPC surface for the embedded node agent. Transport only: validate
 * and delegate to node/node-agent.ts. The renderer's "Self-Hosted
 * Node" section consumes these channels.
 */

import { ipcMain } from "electron";
import {
    getNodeAgent,
    isNodeAgentAvailable,
    type NodeAgentStatus,
} from "../node/node-agent";

/** Matches the ApiResult shape the preload exposes (success/error/data). */
interface ApiResult<T = unknown> {
    success: boolean;
    error?: string;
    message?: string;
    data?: T;
}

export function registerNodeRuntimeIpc(): void {
    const agent = getNodeAgent();

    ipcMain.handle("node-runtime:get-info", (): ApiResult<NodeAgentStatus> => ({
        success: true,
        data: agent.getStatus(),
    }));

    ipcMain.handle(
        "node-runtime:is-installed",
        (): ApiResult<NodeAgentStatus> => ({
            success: true,
            data: {
                ...agent.getStatus(),
                // The native agent is always present — no payload to miss.
                // (kept for renderer compatibility)
            },
        }),
    );

    ipcMain.handle("node-runtime:start", (): ApiResult<NodeAgentStatus> => {
        try {
            const result = agent.start();
            return {
                success: result.started,
                error: result.error,
                data: agent.getStatus(),
            };
        } catch (err) {
            return { success: false, error: String(err), data: agent.getStatus() };
        }
    });

    ipcMain.handle(
        "node-runtime:stop",
        async (): Promise<ApiResult<NodeAgentStatus>> => {
            try {
                await agent.stop();
                return { success: true, data: agent.getStatus() };
            } catch (err) {
                return { success: false, error: String(err), data: agent.getStatus() };
            }
        },
    );
}