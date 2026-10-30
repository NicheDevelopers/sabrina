import { VideoMetadata } from "../../Db";
import { log } from "../../logging";
import { spawn, spawnSync } from "child_process";

const ytDlpPath = "yt-dlp";

const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const UPDATE_TIMEOUT_MS = 2 * 60 * 1000;
const METADATA_TIMEOUT_MS = 60 * 1000;

interface YtDlpVideo {
  id: string;
  title?: string;
  webpage_url?: string;
  url?: string;
  duration?: number;
  duration_string?: string;
  view_count?: number;
  upload_date?: string;
  thumbnail?: string;
  thumbnails?: { url: string }[];
  uploader?: string;
  uploader_url?: string;
  channel?: string;
  channel_url?: string;
}

function toVideoMetadata(video: YtDlpVideo): VideoMetadata {
  return {
    id: video.id,
    title: video.title ?? null,
    url: video.webpage_url ?? video.url ?? null,
    timestamp: video.duration_string ?? null,
    seconds: video.duration ?? null,
    views: video.view_count ?? null,
    uploadDate: video.upload_date?.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3") ?? null,
    image: video.thumbnail ?? video.thumbnails?.at(-1)?.url ?? null,
    authorName: video.uploader ?? video.channel ?? null,
    authorUrl: video.uploader_url ?? video.channel_url ?? null,
  };
}

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

  public static async fetchVideo(url: string): Promise<VideoMetadata> {
    const [video] = await YtDlp.fetchMetadata(["--no-playlist", url]);
    if (!video) {
      throw new Error(`yt-dlp returned no video for ${url}`);
    }
    return video;
  }

  public static search(query: string): Promise<VideoMetadata[]> {
    return YtDlp.fetchMetadata(["--no-playlist", `ytsearch1:${query}`]);
  }

  /* Flat, so that a whole playlist takes one request instead of one per video */
  public static fetchPlaylist(listId: string): Promise<VideoMetadata[]> {
    return YtDlp.fetchMetadata([
      "--flat-playlist",
      `https://www.youtube.com/playlist?list=${listId}`,
    ]);
  }

  private static fetchMetadata(args: string[]): Promise<VideoMetadata[]> {
    return new Promise((resolve, reject) => {
      const fetcher = spawn(ytDlpPath, ["--dump-json", ...args], {
        timeout: METADATA_TIMEOUT_MS,
      });

      let stdout = "";
      let stderr = "";

      fetcher.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      fetcher.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      fetcher.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
          return;
        }

        try {
          const lines = stdout.split("\n").filter((line) => line.trim() !== "");
          resolve(lines.map((line) => toVideoMetadata(JSON.parse(line) as YtDlpVideo)));
        } catch (error) {
          reject(error as Error);
        }
      });

      fetcher.on("error", reject);
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
