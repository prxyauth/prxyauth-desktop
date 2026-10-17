/**
 * Profile directories for the embedded node agent — plain folders under
 * userData, one per backend profile name (the account email, sanitized).
 *
 * Deliberately NO database: the node agent's only per-profile state is the
 * Chrome profile directory itself (the synced sign-in state IS the value).
 * Integrity recovery exists in selfhosted's ProfileManager, but for the
 * desktop agent a missing/locked dir is simply recreated — the backend
 * re-authenticates the session anyway on the next login.
 */

import { mkdirSync } from "fs";
import { existsSync } from "fs";
import path from "path";
import { app } from "electron";

/** Base directory for all node-agent profile dirs. */
export function profilesBaseDir(): string {
    return path.join(app.getPath("userData"), "node-profiles");
}

/** Sanitize a backend-provided profile name into a safe directory name. */
function sanitize(name: string): string {
    const cleaned = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._@+-]/g, "_");
    return cleaned || "profile";
}

/**
 * Resolve (and create) the profile directory for a backend profile name.
 * Deterministic mapping: same name → same dir, so the synced Google
 * sign-in state survives across launches.
 */
export function ensureProfileDir(profileName: string): string {
    const dir = path.join(profilesBaseDir(), sanitize(profileName));
    mkdirSync(dir, { recursive: true });
    return dir;
}

/**
 * True when the profile dir holds no Chrome state yet (no 'Default'
 * subfolder) — i.e. the very first launch into it. Used to decide whether
 * importing the backend's storageState would seed or clobber.
 */
export function isProfileEmpty(profileDir: string): boolean {
    return !existsSync(path.join(profileDir, "Default"));
}