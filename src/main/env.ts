import { app } from "electron";
import path from "path";
import fs from "fs";

// Determine and ensure the browsers path exists
const BROWSERS_PATH = path.join(app.getPath("userData"), "browsers");
if (!fs.existsSync(BROWSERS_PATH)) {
  fs.mkdirSync(BROWSERS_PATH, { recursive: true });
}

// Set the environment variable for Playwright
process.env.PLAYWRIGHT_BROWSERS_PATH = BROWSERS_PATH;

// Log to both console and electron-log if possible
console.error(`[Env Setup] BROWSERS_PATH: ${BROWSERS_PATH}`);
console.error(
  `[Env Setup] process.env.PLAYWRIGHT_BROWSERS_PATH: ${process.env.PLAYWRIGHT_BROWSERS_PATH}`,
);
