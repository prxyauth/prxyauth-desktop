import { autoUpdater } from "electron-updater";
import { dialog, BrowserWindow } from "electron";
import log from "electron-log";

// Configure logging
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = "info";

// Disable auto-download so we can prompt user first
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export function initAutoUpdater(mainWindow: BrowserWindow | null) {
  log.info("Auto-updater initialized");

  // Check for updates every hour
  setInterval(
    () => {
      autoUpdater.checkForUpdates();
    },
    60 * 60 * 1000,
  );

  // Initial check (delay to let app fully load)
  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, 5000);

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for update...");
  });

  autoUpdater.on("update-available", async (info) => {
    log.info("Update available:", info.version);

    const result = await dialog.showMessageBox({
      type: "info",
      title: "Update Available",
      message: `A new version (${info.version}) is available!`,
      detail: "Would you like to download and install it now?",
      buttons: ["Download Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available.");
  });

  autoUpdater.on("error", (err) => {
    log.error("Error in auto-updater:", err);
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent);
    log.info(`Download progress: ${percent}%`);

    // Update window title with progress
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(
        `PRXY Browser Client - Downloading update ${percent}%`,
      );
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    log.info("Update downloaded:", info.version);

    // Reset window title
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle("PRXY Browser Client");
    }

    const result = await dialog.showMessageBox({
      type: "info",
      title: "Update Ready",
      message: `Version ${info.version} has been downloaded.`,
      detail:
        "The update will be installed when you restart the app. Restart now?",
      buttons: ["Restart Now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates();
}
