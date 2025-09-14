import yts from "yt-search";
import {
  PlaylistMetadataResult,
  SearchResult,
  VideoMetadataResult,
} from "npm:@types/yt-search@2.10.3";
import { YtDlp } from "./YtDlp.ts";
import AudioFileRepository, {
  audioFileRepository,
} from "../AudioFileRepository.ts";
import Db, { VideoDataRecord } from "../../db.ts";
import { log } from "../../logging.ts";
import { ParsedQuery, QueryKind } from "../QueryParser.ts";
import UrlValidator from "../UrlValidator.ts";

export default class YouTube {
  public static async getByQuery(query: ParsedQuery): Promise<VideoDataRecord> {
    const videoId = await this.resolveQueryToVideoId(query);
    if (!videoId) {
      log.warn("Could not resolve query to a video ID:", query);
      throw new Error("Could not resolve query to a video ID");
    }
    await this.findLocalOrDownload(videoId);
    const videoData = Db.getVideoData(videoId);
    if (!videoData) {
      log.error(
        "Video data not found in database after download for video ID:",
        videoId,
      );
      throw new Error("Video data not found in database after download");
    }
    return videoData;
  }

  /* Finds audio file path in repository or downloads it if not found */
  private static async findLocalOrDownload(videoId: string): Promise<string> {
    const existingRecord = Db.getVideoData(videoId);
    if (existingRecord) {
      log.debug(
        `Found a DB record for video ID ${videoId}, verifying file exists on disk...`,
      );
      const pathFromDisk = audioFileRepository.getPath(existingRecord.id);
      if (!pathFromDisk) {
        log.warn(
          `Audio file for video ID ${videoId} recorded in database but not found on disk. Re-downloading...`,
        );
        return await this.downloadAudio(videoId);
      }
      log.debug(
        `Verified audio file for video ID ${videoId} exists on disk at path: ${pathFromDisk}`,
      );
      return pathFromDisk;
    }
    return await this.downloadAudio(videoId);
  }

  /* Downloads audio for a given YouTube video ID and returns the file path */
  private static async downloadAudio(videoId: string): Promise<string> {
    log.debug("Downloading audio for video ID:", videoId);
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const videoData = await this.getVideoData(videoId);
    console.debug(
      `Downloading audio for video: ${{
        title: videoData.title,
        videoId: videoData.videoId,
        url: videoData.url,
        author: videoData.author,
      }}`,
    );
    console.log(videoData);
    const filePath = await YtDlp.downloadAudio(
      url,
      AudioFileRepository.audioFolderPath,
    );
    if (!filePath) {
      log.error("Failed to download audio for video ID:", videoId);
      throw new Error("Failed to download audio");
    }
    Db.insertVideoPath(videoId, filePath, videoData);
    return filePath;
  }

  private static async resolveQueryToVideoId(
    query: ParsedQuery,
  ): Promise<string | null> {
    if (query.type === QueryKind.YT_URL) {
      const videoId = UrlValidator.extractVideoId(new URL(query.payload));
      log.debug(`Resolved video ID from URL: ${videoId}`);
      return videoId;
    }
    const video = await this.searchFirstVideo(query.payload);
    log.debug(
      `Resolved video ID from search: ${video ? video.videoId : "not found"}`,
    );
    return video ? video.videoId : null;
  }

  public static async search(query: string): Promise<SearchResult> {
    return await yts.search(query);
  }

  private static async searchFirstVideo(
    query: string,
  ): Promise<VideoMetadataResult | null> {
    const results = await yts.search(query);
    const firstVideo = results.all.find((result) => result.type === "video") as
      | VideoMetadataResult
      | undefined;
    return firstVideo || null;
  }

  public static async getVideoData(
    videoId: string,
  ): Promise<VideoMetadataResult> {
    return await yts.search({ videoId });
  }

  public static async getPlaylist(
    listId: string,
  ): Promise<PlaylistMetadataResult> {
    return await yts.search({ listId });
  }
}
