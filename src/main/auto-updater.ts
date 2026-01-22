import { autoUpdater } from "electron-updater";
import log from "electron-log";

// Configure logging
autoUpdater.logger = log;
(autoUpdater.logger as any).transports.file.level = "info";

export function initAutoUpdater() {
    log.info("App starting...");

    // Check for updates every hour
    setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
    }, 60 * 60 * 1000);

    // Initial check
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on("checking-for-update", () => {
        log.info("Checking for update...");
    });

    autoUpdater.on("update-available", (info) => {
        log.info("Update available.");
    });

    autoUpdater.on("update-not-available", (info) => {
        log.info("Update not available.");
    });

    autoUpdater.on("error", (err) => {
        log.error("Error in auto-updater: " + err);
    });

    autoUpdater.on("download-progress", (progressObj) => {
        let log_message = "Download speed: " + progressObj.bytesPerSecond;
        log_message = log_message + " - Downloaded " + progressObj.percent + "%";
        log_message = log_message + " (" + progressObj.transferred + "/" + progressObj.total + ")";
        log.info(log_message);
    });

    autoUpdater.on("update-downloaded", (info) => {
        log.info("Update downloaded; will install now");
        // You could show a message to the user here
        // For now, let's just use auto-update as requested
        // autoUpdater.quitAndInstall();
    });
}

export function checkForUpdates() {
    autoUpdater.checkForUpdatesAndNotify();
}
