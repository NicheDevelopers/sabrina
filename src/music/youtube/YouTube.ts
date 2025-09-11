import yts from "yt-search";
import {PlaylistMetadataResult, SearchResult, VideoMetadataResult} from "npm:@types/yt-search@2.10.3";

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
}
