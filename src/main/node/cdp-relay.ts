/**
 * CDP relay — the node side of the backend's CDP bridge.
 *
 * The backend (be-prxyauth) opens one loopback WebSocket server per session
 * (SelfhostedCdpBridge); every Playwright connection to it is multiplexed as
 * a `connId`. For each connId this relay opens a WebSocket to the session's
 * local Chrome browser-level CDP endpoint and pipes frames bidirectionally:
 *
 *   backend --cdp(base64)----> relay --TEXT--> Chrome
 *   Chrome  --ws message-----> relay --cdp(base64)--> backend
 *
 * Two hard-won protocol rules (both proven in live E2E):
 *  - CDP over WebSocket is TEXT-framed JSON. Frames must be sent as text —
 *    a binary frame violates Chrome's CDP endpoint and the socket closes
 *    instantly.
 *  - The backend relays Playwright's first CDP command immediately after
 *    cdp-open; the local socket may not be open yet (open race). Dropping
 *    that frame stalls the handshake until connectOverCDP's 30s timeout —
 *    buffer early frames and flush on open instead.
 *
 * Ported verbatim from prxyauth-selfhosted src/features/tunnel/infrastructure/cdp-relay.ts.
 */

import WebSocket from "ws";
import log from "electron-log";
import type { TunnelMessage } from "./tunnel-types";

/** A node-local CDP WebSocket bridged over the tunnel. */
interface CdpConn {
    ws: WebSocket;
    everConnected: boolean;
    /** Backend frames that arrived before the local ws opened (open race).
     *  Bounded so a wedged socket cannot grow it without limit. */
    pending: Buffer[];
}

export class CdpRelay {
    /** sessionId → connId → local CDP WebSocket. */
    private sessions = new Map<string, Map<number, CdpConn>>();

    constructor(
        /** Sends a frame to the control plane over the node tunnel. */
        private readonly send: (msg: TunnelMessage) => void,
        private readonly onLog: (level: "info" | "warn", message: string) => void = () => {},
    ) {
        void log; // electron-log available for future verbose relay logging
    }

    /** Opens the node-local side of a bridge connection: a WebSocket to the
     *  session's Chrome browser-level CDP endpoint. */
    open(sessionId: string, connId: number, nodeCdpUrl: string): void {
        this.onLog("info", `relay: cdp-open s=${sessionId} c=${connId} -> ${nodeCdpUrl}`);
        let conns = this.sessions.get(sessionId);
        if (!conns) {
            conns = new Map();
            this.sessions.set(sessionId, conns);
        }
        // A duplicate connId would orphan the previous socket — replace it.
        const previous = conns.get(connId);
        if (previous) {
            try {
                previous.ws.close();
            } catch {
                /* already closed */
            }
        }

        const ws = new WebSocket(nodeCdpUrl, {
            perMessageDeflate: false,
            maxPayload: 256 * 1024 * 1024,
        });
        const conn: CdpConn = { ws, everConnected: false, pending: [] };
        conns.set(connId, conn);

        ws.on("open", () => {
            conn.everConnected = true;
            this.onLog(
                "info",
                `relay: local CDP ws open (c=${connId}), flushing ${conn.pending.length} buffered frame(s)`,
            );
            for (const frame of conn.pending.splice(0)) {
                ws.send(frame.toString("utf-8"));
            }
        });

        ws.on("message", (data) => {
            const buf = Buffer.from(data as Buffer);
            this.send({
                type: "cdp",
                payload: { sessionId, connId, data: buf.toString("base64") },
            });
        });

        ws.on("close", () => {
            this.onLog("info", `relay: local CDP ws closed (c=${connId})`);
            conns?.delete(connId);
            this.send({ type: "cdp-close", payload: { sessionId, connId } });
        });

        ws.on("error", (err) => {
            this.onLog("warn", `relay: local CDP ws error: ${err.message}`);
            if (!conn.everConnected) {
                // Chrome died or CDP refused — propagate the close upstream.
                conns?.delete(connId);
                this.send({ type: "cdp-close", payload: { sessionId, connId } });
            }
        });
    }

    /** Backend frame (base64) → local Chrome, as a TEXT frame. */
    handleServerCdp(sessionId: string, connId: number, b64: string): void {
        const conn = this.sessions.get(sessionId)?.get(connId);
        if (!conn) {
            this.onLog("warn", `relay: dropped backend frame — no conn s=${sessionId} c=${connId}`);
            return;
        }
        const frame = Buffer.from(b64, "base64");
        if (conn.ws.readyState !== WebSocket.OPEN) {
            // Open race — buffer, flush on open.
            if (conn.pending.length < 256) conn.pending.push(frame);
            return;
        }
        conn.ws.send(frame.toString("utf-8"));
    }

    /** Backend closed its side of a bridge connection — close the local one. */
    closeConn(sessionId: string, connId: number): void {
        const conn = this.sessions.get(sessionId)?.get(connId);
        if (!conn) return;
        try {
            conn.ws.close();
        } catch {
            /* already closed */
        }
    }

    /** Closes every local conn for a session (terminate). Chrome itself is
     *  closed separately via the browser service so the profile flushes. */
    terminateSession(sessionId: string): void {
        const conns = this.sessions.get(sessionId);
        if (!conns) return;
        this.sessions.delete(sessionId);
        for (const conn of conns.values()) {
            try {
                conn.ws.close();
            } catch {
                /* already closed */
            }
        }
    }

    /** Close everything (tunnel shutdown). */
    closeAll(): void {
        for (const sessionId of [...this.sessions.keys()]) {
            this.terminateSession(sessionId);
        }
    }

    /** Number of active bridged sessions (for status surfaces). */
    sessionCount(): number {
        return this.sessions.size;
    }
}