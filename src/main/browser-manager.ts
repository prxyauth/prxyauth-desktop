import { app, BrowserWindow, ipcMain } from "electron";
import log from "electron-log";
import fs from "fs";
import path from "path";
import { ParallelDownloader, ParallelProgress } from "./downloader";

export class BrowserManager {
  private static instance: BrowserManager;
  private isDownloading = false;
  private progress: ParallelProgress = {
    percent: 0,
    message: "Initializing...",
    components: {},
  };
  private browsersPath: string;
  private downloader: ParallelDownloader;

  private constructor() {
    this.browsersPath = path.join(app.getPath("userData"), "browsers");
    log.info("[BrowserManager] Initialized with path:", this.browsersPath);
    this.downloader = new ParallelDownloader(this.browsersPath);
    this.setupIpc();
  }

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  private setupIpc() {
    ipcMain.handle("browser:getStatus", async () => {
      const installed = this.isInstalled();
      return {
        isInstalled: installed,
        isDownloading: this.isDownloading,
        progress: this.progress,
        path: this.browsersPath,
      };
    });

    ipcMain.handle("browser:install", async () => {
      if (this.isDownloading)
        return { success: false, message: "Already downloading" };

      this.install(BrowserWindow.getFocusedWindow()).catch((err) => {
        log.error("[BrowserManager] Parallel install failed:", err);
      });

      return { success: true };
    });
  }

  public isInstalled(): boolean {
    try {
      process.env.PLAYWRIGHT_BROWSERS_PATH = this.browsersPath;
      const { chromium } = require("playwright-core");

      const standardPath = chromium.executablePath();
      if (fs.existsSync(standardPath)) return true;

      const flatPath = standardPath.replace(/[\\/]playwright[\\/]/, path.sep);
      if (fs.existsSync(flatPath)) return true;

      const revisionMatch = standardPath.match(/chromium-(\d+)/);
      if (revisionMatch) {
        const revPath = path.join(
          this.browsersPath,
          `chromium-${revisionMatch[1]}`,
          "chrome-win64",
          "chrome.exe",
        );
        if (fs.existsSync(revPath)) return true;
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  public async ensureInstalled(
    mainWindow: BrowserWindow | null = null,
  ): Promise<void> {
    if (this.isInstalled()) {
      log.info("[BrowserManager] Browser already present.");
      return;
    }

    log.info("[BrowserManager] Browser missing, starting parallel setup.");
    await this.install(mainWindow);
  }

  private async install(
    mainWindow: BrowserWindow | null = null,
  ): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("browser:install-started");
    }

    try {
      await this.downloader.downloadAll((p) => {
        this.progress = p;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send(
            "browser:install-progress",
            this.progress,
          );
        }
      });

      this.isDownloading = false;
      log.info("[BrowserManager] Parallel installation successful.");

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("browser:install-success");
      }
    } catch (err: any) {
      this.isDownloading = false;
      log.error("[BrowserManager] Parallel installation failed:", err);

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("browser:install-failed", {
          error:
            err.message ||
            "Parallel download failed. Please check your internet connection.",
        });
      }
    }
  }

  public getExecutablePath(): string {
    const { chromium } = require("playwright-core");
    const standardPath = chromium.executablePath();
    if (fs.existsSync(standardPath)) return standardPath;

    const flatPath = standardPath.replace(/[\\/]playwright[\\/]/, path.sep);
    if (fs.existsSync(flatPath)) return flatPath;

    const revisionMatch = standardPath.match(/chromium-(\d+)/);
    if (revisionMatch) {
      const revPath = path.join(
        this.browsersPath,
        `chromium-${revisionMatch[1]}`,
        "chrome-win64",
        "chrome.exe",
      );
      if (fs.existsSync(revPath)) return revPath;
    }

    return standardPath;
  }
}
