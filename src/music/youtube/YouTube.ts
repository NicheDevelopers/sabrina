import yts from "yt-search";
import {PlaylistMetadataResult, SearchResult, VideoMetadataResult} from "npm:@types/yt-search@2.10.3";
import {YtDlp} from "./YtDlp.ts";
import AudioFileRepository from "../AudioFileRepository.ts";
import Db from "../../db.ts";
import {log} from "../../logging.ts";

export default class YouTube {
  public static async search(query: string): Promise<SearchResult> {
    return await yts.search(query);
  }
  public static async getVideoData(videoId: string): Promise<VideoMetadataResult> {
    return await yts.search({videoId});
  }
  public static async getPlaylist(listId: string): Promise<PlaylistMetadataResult> {
    return await yts.search({listId});
  }

  public static async downloadAudio(videoId: string): Promise<string> {
    log.debug("Downloading audio for video ID:", videoId);
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const filePath = await YtDlp.downloadAudio(url, AudioFileRepository.audioFolderPath);
    if (!filePath) {
      log.error("Failed to download audio for video ID:", videoId);
      throw new Error("Failed to download audio");
    }
    log.debug("Downloaded audio file path:", filePath);
    Db.insertVideoPath(videoId, filePath);
    return filePath;
  }
}
