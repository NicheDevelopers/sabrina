import AudioFileRepository, { audioFileRepository } from "../AudioFileRepository";
import Db, { sabrinaDb, type VideoDataRecord, type VideoMetadata } from "../../Db";
import { log } from "../../logging";
import { type ParsedQuery, QueryKind } from "../QueryParser";
import * as UrlValidator from "../UrlValidator";
import * as YtDlp from "./YtDlp";

export interface VideoDataFetchError {
  videoId: string;
  error: string;
}
export interface QueryResult {
  videos: VideoDataRecord[];
  errors: VideoDataFetchError[];
}

export default class YouTube {
  private audioRepo: AudioFileRepository;
  private db: Db;
  private downloads: Map<string, Promise<string>> = new Map(); // videoId -> running download
  private preloads: Promise<void> = Promise.resolve();

  constructor(audioFileRepository: AudioFileRepository, Db: Db) {
    this.audioRepo = audioFileRepository;
    this.db = Db;
  }

  public async handleQuery(query: ParsedQuery): Promise<QueryResult> {
    if (query.type === QueryKind.YT_URL) {
      return await this.handleVideoUrl(new URL(query.payload));
    }

    const results =
      query.type === QueryKind.YT_SEARCH
        ? await YtDlp.search(query.payload)
        : await YtDlp.fetchPlaylist(query.payload);

    const videos = results.map((video) => this.saveVideo(video));
    return { videos, errors: [] };
  }

  /* Finds audio file path in repository or downloads it if not found */
  public async findLocalOrDownload(videoId: string): Promise<string> {
    const pathFromDisk = this.audioRepo.getPath(videoId);
    if (pathFromDisk) {
      log.debug(`Audio file found on disk: ${videoId} at ${pathFromDisk}`);
      return pathFromDisk;
    }

    log.debug(`Audio file not on disk, downloading: ${videoId}`);
    return await this.joinOrStartDownload(videoId, false);
  }

  /* Downloads audio ahead of time, one video at a time, so several preloads never pile up.
   * Never rejects: a failed preload is retried and reported when the song actually plays.
   */
  public preload(videoId: string): Promise<void> {
    this.preloads = this.preloads.then(async () => {
      if (this.audioRepo.getPath(videoId) || this.downloads.has(videoId)) {
        return;
      }

      log.debug(`Preloading audio file: ${videoId}`);
      try {
        await this.joinOrStartDownload(videoId, true);
      } catch (error) {
        log.warn(`Audio preload failed: ${videoId}`, error);
      }
    });
    return this.preloads;
  }

  /* A second yt-dlp would write to the same file as the one already running */
  private joinOrStartDownload(videoId: string, background: boolean): Promise<string> {
    const running = this.downloads.get(videoId);
    if (running) {
      return running;
    }

    const download = this.downloadAudio(videoId, background).finally(() => {
      this.downloads.delete(videoId);
    });
    this.downloads.set(videoId, download);
    return download;
  }

  private async handleVideoUrl(url: URL): Promise<QueryResult> {
    const videoId = UrlValidator.extractVideoId(url);

    try {
      const record =
        this.db.getVideoRecord(videoId) ??
        this.saveVideo(await YtDlp.fetchVideo(this.watchUrl(videoId)));
      return { videos: [record], errors: [] };
    } catch (error) {
      log.error(`Error handling video ID ${videoId}:`, error);
      return { videos: [], errors: [{ videoId, error: String(error) }] };
    }
  }

  private saveVideo(video: VideoMetadata): VideoDataRecord {
    this.db.insertVideo(video);

    const record = this.db.getVideoRecord(video.id);
    if (!record) {
      throw new Error(`Video ${video.id} is missing after saving it`);
    }
    return record;
  }

  /* Downloads audio for a given YouTube video ID and returns the file path */
  private async downloadAudio(videoId: string, background: boolean): Promise<string> {
    log.info(`Starting audio download: ${videoId}`);

    const filePath = await YtDlp.downloadAudio(
      this.watchUrl(videoId),
      AudioFileRepository.audioFolderPath,
      { background },
    );

    if (!filePath) {
      log.error(`Audio download failed: ${videoId}`);
      throw new Error("Failed to download audio");
    }

    this.db.setVideoPath(videoId, filePath);
    this.audioRepo.registerVideo(videoId, filePath);
    log.info(`Audio download completed: ${videoId} saved to ${filePath}`);
    return filePath;
  }

  private watchUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
}

export const youTube = new YouTube(audioFileRepository, sabrinaDb);
