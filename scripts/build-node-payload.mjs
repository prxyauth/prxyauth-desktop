/**
 * Assemble the embedded node-runtime payload for the desktop app.
 *
 * Run from prxyauth-desktop:  node scripts/build-node-payload.mjs
 * Prereq: prxyauth-selfhosted has a fresh `pnpm build` (dist/index.jsc).
 *
 * Layout produced (same dev and packaged — see services/node-runtime.ts):
 *
 *   node-runtime/
 *     dist/                ← selfhosted dist (index.jsc + database/ + public/ + swagger)
 *     node_modules/        ← bytenode + the 5 externals (ABI-146 sqlite, playwright)
 *     package.json         ← { type: "commonjs" } so the .jsc resolves as CJS
 *     prisma/schema.prisma  ← schema for db push on first boot
 *
 * The ABI-146 better-sqlite3 comes from the selfhosted repo's own
 * rebuild-native-for-electron.mjs pipeline (run there first — the
 * desktop packaging prebuild runs it for the DESKTOP's sqlite, this
 * payload ships the selfhosted repo's).
 */

import { cpSync, existsSync, mkdirSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, "..");
const selfhostedRoot = path.resolve(desktopRoot, "..", "prxyauth-selfhosted");

const payloadDir = path.join(desktopRoot, "node-runtime");
const shDist = path.join(selfhostedRoot, "dist");

function fail(msg) {
    console.error(`✖ ${msg}`);
    process.exit(1);
}

/** Locate prebuild-install's bin.js under pnpm's symlink farm. */
async function findPrebuildInstall(repoRoot) {
    const nm = path.join(repoRoot, "node_modules");
    const candidates = [
        path.join(nm, ".bin", "prebuild-install.cmd"),
        path.join(nm, ".bin", "prebuild-install"),
        path.join(nm, "prebuild-install", "bin.js"),
    ];
    for (const c of candidates) {
        if (existsSync(c)) return c;
    }
    const store = path.join(nm, ".pnpm");
    if (existsSync(store)) {
        for (const cell of readdirSync(store)) {
            if (!cell.startsWith("prebuild-install@")) continue;
            const c = path.join(store, cell, "node_modules", "prebuild-install", "bin.js");
            if (existsSync(c)) return c;
        }
    }
    return null;
}

// ── Prereqs ────────────────────────────────────────────────────────────
if (!existsSync(path.join(selfhostedRoot, "package.json"))) {
    fail(`prxyauth-selfhosted not found at ${selfhostedRoot}`);
}
if (!existsSync(path.join(shDist, "index.jsc"))) {
    fail(
        `No bytecode at ${path.join(shDist, "index.jsc")} — run \`pnpm build\` in prxyauth-selfhosted first.`,
    );
}

// The payload must ship the Electron-ABI sqlite — verify the selfhosted
// repo's native binary is the Electron build before copying it in.
const sqlitePkg = path.join(selfhostedRoot, "node_modules", "better-sqlite3", "package.json");
if (!existsSync(sqlitePkg)) fail("better-sqlite3 not installed in prxyauth-selfhosted");

// ── Clean + assemble ───────────────────────────────────────────────────
console.log("🧹 Cleaning node-runtime/ ...");
rmSync(payloadDir, { recursive: true, force: true });
mkdirSync(path.join(payloadDir, "dist"), { recursive: true });

console.log("📦 Copying dist/ (bytecode + prisma client + dashboard) ...");
cpSync(shDist, path.join(payloadDir, "dist"), { recursive: true });

console.log("📝 Writing node-runtime/package.json (commonjs) ...");
writeFileSync(
    path.join(payloadDir, "package.json"),
    JSON.stringify({ type: "commonjs" }, null, 2),
);

console.log("📚 Copying externals into node-runtime/node_modules/ ...");
const externals = [
    "bytenode",
    "@prisma/client",
    "@prisma/client-runtime-utils",
    "@prisma/adapter-better-sqlite3",
    "playwright",
    "playwright-core",
    "better-sqlite3",
    "bindings",
    "file-uri-to-path",
];

// The payload must run under the DESKTOP app's Electron ABI — the node
// server spawns with ELECTRON_RUN_AS_NODE under the desktop's binary, so
// child and parent share the exact Electron build. The selfhosted repo
// keeps its sqlite at host ABI (137) for tsx/vitest; install the desktop
// Electron prebuild BEFORE copying, then restore the host binary after.
console.log("🔧 Building better-sqlite3 for the desktop's Electron ABI ...");
const desktopElectronVersion = (
    await import("electron/package.json", { with: { type: "json" } })
).default.version;
console.log(`🎯 Desktop Electron: v${desktopElectronVersion}`);
const sqliteModDir = path.join(selfhostedRoot, "node_modules", "better-sqlite3");
const prebuildBin = await findPrebuildInstall(selfhostedRoot);
if (!prebuildBin) fail("prebuild-install not found in selfhosted repo");
try {
    execFileSync(
        process.execPath,
        [
            prebuildBin,
            "-f",
            "-d",
            "--runtime",
            "electron",
            "--target",
            desktopElectronVersion,
            "--arch",
            process.arch,
        ],
        { cwd: sqliteModDir, stdio: "inherit" },
    );
} catch {
    // No prebuild for this Electron (e.g. 28.x) — compile from source
    // against the Electron headers. Requires VS Build Tools + Python.
    console.log("🛠 No prebuild — compiling better-sqlite3 from source ...");
    try {
        execFileSync(
            "npx",
            [
                "--yes",
                "node-gyp",
                "rebuild",
                "--release",
                `--runtime=electron`,
                `--target=${desktopElectronVersion}`,
                "--dist-url=https://electronjs.org/headers",
            ],
            { cwd: sqliteModDir, stdio: "inherit", shell: process.platform === "win32" },
        );
    } catch {
        fail("better-sqlite3 source compile for Electron failed — see output above.");
    }
}

/**
 * pnpm installs packages as symlinks into a central .pnpm store; on Windows
 * the "symlinks" are junctions. Resolve through the junction to the real
 * physical directory so cpSync copies actual files (not links).
 */
/**
 * Resolve a package's physical directory under pnpm's layout: a top-level
 * junction into node_modules/.pnpm/<name>@<ver>/node_modules/<name>, or —
 * when the package is only a transitive dep (playwright-core under
 * playwright) — found inside another package's .pnpm cell.
 */
function resolvePackage(name) {
    const nm = path.join(selfhostedRoot, "node_modules");
    const direct = path.join(nm, name);
    if (existsSync(direct)) return realpathSync(direct);

    // transitive: scan the .pnpm store for <cell>/node_modules/<name>
    const store = path.join(nm, ".pnpm");
    if (!existsSync(store)) return null;
    const base = path.basename(name);
    const scope = path.dirname(name) !== "." ? path.dirname(name) : null;
    for (const cell of readdirSync(store)) {
        const candidate = path.join(store, cell, "node_modules", name);
        if (scope ? candidate.endsWith(path.join("node_modules", name)) : true) {
            if (existsSync(candidate)) {
                // ensure exact name match (path.join handles scoped names)
                if (path.basename(candidate) === base) return realpathSync(candidate);
            }
        }
    }
    return null;
}

for (const pkg of externals) {
    const src = resolvePackage(pkg);
    if (!src) fail(`External ${pkg} missing from selfhosted node_modules`);
    const dest = path.join(payloadDir, "node_modules", pkg);
    cpSync(src, dest, { recursive: true });
}

// @prisma/client resolves the generated client via node_modules/.prisma
const dotPrisma = path.join(selfhostedRoot, "node_modules", ".prisma");
if (existsSync(dotPrisma)) {
    cpSync(dotPrisma, path.join(payloadDir, "node_modules", ".prisma"), { recursive: true });
}

console.log("🗄️ Copying prisma/schema.prisma (for first-boot db push) ...");
cpSync(
    path.join(selfhostedRoot, "prisma", "schema.prisma"),
    path.join(payloadDir, "prisma", "schema.prisma"),
);

// Restore the selfhosted repo's host-ABI sqlite so its tsx/vitest keep
// working after this script borrows the Electron build.
console.log("↩️ Restoring host-ABI better-sqlite3 in selfhosted repo ...");
try {
    execFileSync(
        process.execPath,
        [prebuildBin, "-f", "-d", "--runtime", "node"],
        { cwd: sqliteModDir, stdio: "inherit" },
    );
} catch {
    console.warn(
        "⚠️ Host restore failed — selfhosted tsx/vitest may need `node scripts/rebuild-native-for-electron.mjs --host`",
    );
}

console.log("✅ Payload assembled at", payloadDir);