import { net } from "electron";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import log from "electron-log";
const extract = require("extract-zip");

export interface ComponentProgress {
  name: string;
  total: number;
  downloaded: number;
  percent: number;
}

export interface ParallelProgress {
  percent: number;
  message: string;
  components: Record<string, ComponentProgress>;
}

export class ParallelDownloader {
  private components = [
    {
      name: "chromium",
      url: "https://cdn.playwright.dev/dbazure/download/playwright/builds/chromium/1200/chromium-win64.zip",
      folder: "chromium-1200",
    },
    // {
    //   name: "ffmpeg",
    //   url: "https://cdn.playwright.dev/dbazure/download/playwright/builds/ffmpeg/1011/ffmpeg-win64.zip",
    //   folder: "ffmpeg-1011",
    // },
    // {
    //   name: "winldd",
    //   url: "https://cdn.playwright.dev/dbazure/download/playwright/builds/winldd/1007/winldd-win64.zip",
    //   folder: "winldd-1007",
    // },
  ];

  private status: ParallelProgress = {
    percent: 0,
    message: "Starting parallel download...",
    components: {},
  };

  constructor(private browsersPath: string) {
    this.components.forEach((c) => {
      this.status.components[c.name] = {
        name: c.name,
        total: 0,
        downloaded: 0,
        percent: 0,
      };
    });
  }

  public async downloadAll(
    onProgress: (p: ParallelProgress) => void,
  ): Promise<void> {
    log.info("[ParallelDownloader] Starting parallel download.");

    const tasks = this.components.map((c) =>
      this.downloadComponent(c, onProgress),
    );

    await Promise.all(tasks);
    log.info("[ParallelDownloader] All components processed.");
  }

  private async downloadComponent(
    component: (typeof this.components)[0],
    onProgress: (p: ParallelProgress) => void,
  ): Promise<void> {
    const componentDir = path.join(this.browsersPath, component.folder);

    // Quick check if core binary exists
    if (component.name === "chromium") {
      const chromeExe = path.join(componentDir, "chrome-win64", "chrome.exe");
      if (fs.existsSync(chromeExe)) {
        log.info(`[ParallelDownloader] ${component.name} already installed.`);
        this.status.components[component.name].percent = 100;
        this.updateTotal(onProgress);
        return;
      }
    } else if (fs.existsSync(componentDir)) {
      log.info(`[ParallelDownloader] ${component.name} folder exists.`);
      this.status.components[component.name].percent = 100;
      this.updateTotal(onProgress);
      return;
    }

    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    const tempZip = path.join(
      os.tmpdir(),
      `prxyauth-${component.name}-${Date.now()}.zip`,
    );

    return new Promise((resolve, reject) => {
      const request = net.request(component.url);

      request.on("response", (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download ${component.name}: ${response.statusCode}`,
            ),
          );
          return;
        }

        const totalBytes =
          parseInt(response.headers["content-length"] as string, 10) || 0;
        this.status.components[component.name].total = totalBytes;

        const fileStream = fs.createWriteStream(tempZip);
        let downloadedBytes = 0;

        response.on("data", (chunk) => {
          downloadedBytes += chunk.length;
          fileStream.write(chunk);

          this.status.components[component.name].downloaded = downloadedBytes;
          if (totalBytes > 0) {
            this.status.components[component.name].percent = Math.floor(
              (downloadedBytes / totalBytes) * 100,
            );
          }
          this.updateTotal(onProgress);
        });

        response.on("end", async () => {
          fileStream.end();

          try {
            this.status.components[component.name].percent = 100;
            this.status.message = `Extracting ${component.name}...`;
            this.updateTotal(onProgress);

            await extract(tempZip, { dir: componentDir });

            log.info(
              `[ParallelDownloader] ${component.name} extracted to ${componentDir}`,
            );

            if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
            resolve();
          } catch (err) {
            if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip);
            reject(err);
          }
        });

        response.on("error", (err: any) => {
          fileStream.end();
          reject(err);
        });
      });

      request.on("error", (err: any) => {
        reject(err);
      });

      request.end();
    });
  }

  private updateTotal(onProgress: (p: ParallelProgress) => void) {
    const componentValues = Object.values(this.status.components);
    const totalPercent =
      componentValues.reduce((acc, c) => acc + c.percent, 0) /
      componentValues.length;

    this.status.percent = Math.floor(totalPercent);
    onProgress({ ...this.status });
  }
}
