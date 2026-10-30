import { log } from "../../logging";
import { spawn, spawnSync } from "child_process";

const ytDlpPath = "yt-dlp";

const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const UPDATE_TIMEOUT_MS = 2 * 60 * 1000;

export class YtDlp {
  public static init() {
    if (YtDlp.isAvailable()) {
      log.info("yt-dlp is installed.");
    } else {
      log.error("yt-dlp is not installed.");
    }
  }

  private static isAvailable(): boolean {
    try {
      const result = spawnSync(ytDlpPath, ["--version"], {
        stdio: "ignore",
      });
      return result.status === 0;
    } catch {
      return false;
    }
  }

  /* Keeps yt-dlp current without blocking startup, since YouTube changes often break old versions */
  public static startAutoUpdate() {
    void YtDlp.update();
    setInterval(() => void YtDlp.update(), UPDATE_INTERVAL_MS).unref();
  }

  public static update(): Promise<boolean> {
    return new Promise((resolve) => {
      const updater = spawn(ytDlpPath, ["--update-to", "master"], {
        timeout: UPDATE_TIMEOUT_MS,
      });

      let output = "";
      updater.stdout.on("data", (data) => {
        output += data.toString();
      });
      updater.stderr.on("data", (data) => {
        output += data.toString();
      });

      updater.on("close", (code) => {
        if (code === 0) {
          log.info(`yt-dlp update check finished: ${output.trim()}`);
        } else {
          log.warn(`yt-dlp update failed with code ${code}: ${output.trim()}`);
        }
        resolve(code === 0);
      });

      updater.on("error", (error) => {
        log.warn(`yt-dlp update failed: ${error}`);
        resolve(false);
      });
    });
  }

  public static async downloadAudio(url: string, outputDir: string): Promise<string | null> {
    const outputTemplate = `${outputDir}/%(title)s - %(uploader)s [%(id)s].%(ext)s`;

    return new Promise((resolve) => {
      const process = spawn(ytDlpPath, [
        "-x",
        "--print",
        "after_move:filepath",
        "-o",
        outputTemplate,
        url,
      ]);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          log.error(`yt-dlp failed with code ${code}: ${stderr}`);
          resolve(null);
          return;
        }

        const path = stdout.trim();
        if (!path) {
          log.error("Could not find downloaded file path in yt-dlp output.");
          resolve(null);
          return;
        }

        log.info(`Downloaded audio to ${path}`);
        resolve(path);
      });

      process.on("error", (error) => {
        log.error(`yt-dlp process error: ${error}`);
        resolve(null);
      });
    });
  }

  public static getVersion(): string | null {
    try {
      const result = spawnSync(ytDlpPath, ["--version"], {
        encoding: "utf-8",
      });
      if (result.status === 0) {
        return result.stdout.trim();
      } else {
        log.error(`yt-dlp version check failed with code ${result.status}`);
        return null;
      }
    } catch (error) {
      log.error(`Error checking yt-dlp version: ${error}`);
      return null;
    }
  }
}
