import { log } from "../logging";
import { pluralize } from "../Utils";
import * as fs from "node:fs";
import * as path from "node:path";

export default class AudioFileRepository {
  public static readonly audioFolderPath = "./downloads/youtube";

  private static readonly songRegex = /\[([a-zA-Z0-9_-]{11})\]\.(mp3|m4a|wav|ogg|flac|opus)$/;

  private videos: Map<string, string> = new Map(); // videoId -> filePath

  private loadVideosFromDisk() {
    log.info("Loading audio files from disk...");
    try {
      const files = fs.readdirSync(AudioFileRepository.audioFolderPath);

      for (const fileName of files) {
        const filePath = path.join(AudioFileRepository.audioFolderPath, fileName);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && fileName.match(AudioFileRepository.songRegex)) {
          const videoId = this.extractVideoIdFromFilename(fileName);
          if (!videoId) {
            log.warn(`Could not extract video ID from filename: ${fileName}`);
            continue;
          }
          this.registerVideo(videoId, filePath);
        }
      }
    } catch (error) {
      log.error(`Error loading audio files: ${error}`);
    }

    log.info(`Registered ${pluralize(this.videos.size, "audio file")} from disk.`);
  }

  public registerVideo(videoId: string, filePath: string) {
    if (this.videos.has(videoId)) {
      log.warn(`Skipping duplicate video ID detected in repository at ${filePath}: ${videoId}`);
      return;
    }
    log.debug(`Registering audio file for video ID ${videoId} at path: ${filePath}`);
    this.videos.set(videoId, filePath);
  }

  public getPath(videoId: string): string | null {
    const filePath = this.videos.get(videoId);
    if (!filePath) {
      return null;
    }

    if (!fs.existsSync(filePath)) {
      log.warn(`Audio file was deleted from disk: ${filePath}`);
      this.videos.delete(videoId);
      return null;
    }

    return filePath;
  }

  public extractVideoIdFromFilename(filename: string): string | null {
    const match = filename.match(AudioFileRepository.songRegex);
    return match ? match[1] : null;
  }

  public init() {
    try {
      fs.statSync(AudioFileRepository.audioFolderPath);
      log.info("Audio repository folder exists.");
    } catch {
      log.warn("Audio repository folder does not exist. Creating...");
      fs.mkdirSync(AudioFileRepository.audioFolderPath, { recursive: true });
      log.info("Audio repository folder created.");
    }
    this.loadVideosFromDisk();
  }
}

export const audioFileRepository = new AudioFileRepository();
