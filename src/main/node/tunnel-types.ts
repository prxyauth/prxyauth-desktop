/**
 * Prxyauth Node Tunnel — wire protocol types.
 *
 * Mirrors be-prxyauth `src/features/selfhosted/domain/types.ts` (TunnelMessage)
 * exactly — this is the contract spoken over the backend's /ws/selfhosted
 * endpoint. Keep both sides in sync when the protocol changes.
 */

export interface TunnelProxy {
    server: string;
    username?: string;
    password?: string;
}

export type TunnelMessage =
    | { type: "auth"; payload: { nodeKey: string; ticket?: string; agentVersion?: string } }
    | { type: "heartbeat" }
    | {
          type: "launch";
          payload: {
              sessionId: string;
              email: string;
              profileDir: string;
              debugPort: number;
              proxy?: TunnelProxy;
          };
      }
    | { type: "cdp-ready"; payload: { sessionId: string; nodeCdpUrl: string } }
    | { type: "cdp-open"; payload: { sessionId: string; connId: number; nodeCdpUrl: string } }
    | { type: "cdp"; payload: { sessionId: string; connId: number; data: string } }
    | { type: "cdp-close"; payload: { sessionId: string; connId: number } }
    | { type: "terminate"; payload: { sessionId: string } }
    | { type: "error"; payload: { code: string; message: string } };