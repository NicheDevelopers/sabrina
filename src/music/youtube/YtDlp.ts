import { log } from "../../logging";
import { spawn, spawnSync } from "child_process";

const ytDlpPath = "yt-dlp";

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
