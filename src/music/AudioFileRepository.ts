import { log } from "../logging.ts";

export default class AudioFileRepository {
  public static readonly audioFolderPath = "./downloads/youtube";

  private videos: Map<string, string> = new Map(); // videoId -> filePath

  private loadVideosFromDisk() {
    log.info("Loading audio files from disk...");
    for (
      const dirEntry of Deno.readDirSync(AudioFileRepository.audioFolderPath)
    ) {
      if (dirEntry.isFile && dirEntry.name.endsWith(".mp3")) {
        const videoId = this.extractVideoIdFromFilename(dirEntry.name);
        if (!videoId) {
          log.warn(
            `Could not extract video ID from filename: ${dirEntry.name}`,
          );
          continue;
        }
        const filePath =
          `${AudioFileRepository.audioFolderPath}/${dirEntry.name}`;
        this.videos.set(videoId, filePath);
        log.debug(
          `Loaded audio file for video ID ${videoId} at path: ${filePath}`,
        );
      }
    }
    log.info(`Loaded ${this.videos.size} audio files from disk.`);
  }

  public getPath(videoId: string): string | null {
    return this.videos.get(videoId) || null;
  }

  private extractVideoIdFromFilename(filename: string): string | null {
    const match = filename.match(/\[([a-zA-Z0-9_-]{11})\]/);
    return match ? match[1] : null;
  }

  public init() {
    try {
      Deno.statSync(AudioFileRepository.audioFolderPath);
      log.info("Audio repository folder exists.");
    } catch (_e) {
      log.warn("Audio repository folder does not exist. Creating...");
      Deno.mkdirSync(AudioFileRepository.audioFolderPath);
      log.info("Audio repository folder created.");
    }
    this.loadVideosFromDisk();
  }
}

export const audioFileRepository = new AudioFileRepository();
