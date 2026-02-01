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
    log.info("Update details:", JSON.stringify(info));

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
      log.info("User accepted update download");
      autoUpdater.downloadUpdate();
    } else {
      log.info("User deferred update download");
    }
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("Update not available. Current version:", info.version);
  });

  autoUpdater.on("error", (err) => {
    log.error("Error in auto-updater:", err);
    dialog.showErrorBox(
      "Update Error",
      `An error occurred while checking for updates: ${err.message || err}`,
    );
  });

  autoUpdater.on("download-progress", (progressObj) => {
    const percent = Math.round(progressObj.percent);
    const speed = Math.round(progressObj.bytesPerSecond / 1024); // KB/s
    log.info(`Download progress: ${percent}% (${speed} KB/s)`);

    // Update window title with progress
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle(
        `PRXY Browser Client - Downloading update ${percent}%`,
      );
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    log.info("Update downloaded successfully:", info.version);
    log.info("Update path:", info.downloadedFile);

    // Reset window title
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitle("PRXY Browser Client");
    }

    const result = await dialog.showMessageBox({
      type: "info",
      title: "Update Ready",
      message: `Version ${info.version} has been downloaded.`,
      detail:
        "The application needs to restart to apply the update. Restart now?",
      buttons: ["Restart and Update", "Later"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      log.info("User chose to restart and install update");
      // Use setImmediate to ensure all window events are handled before quitting
      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true);
      });
    } else {
      log.info("User chose to install update later");
    }
  });
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates();
}
