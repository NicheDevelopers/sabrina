import yts, {
    PlaylistMetadataResult,
    SearchResult,
    VideoMetadataResult,
} from "yt-search";
import { log } from "../../logging";

export default class YouTubeApi {
    static async fetchVideoData(videoId: string): Promise<VideoMetadataResult> {
        log.debug(`Fetching video metadata: ${videoId}`);
        return await yts.search({ videoId });
    }

    static async fetchPlaylistData(listId: string): Promise<PlaylistMetadataResult> {
        log.debug(`Fetching playlist metadata: ${listId}`);
        return await yts.search({ listId });
    }

    static async fetchSearchResults(query: string): Promise<SearchResult> {
        log.debug(`Fetching search results for: ${query}`);
        return await yts.search(query);
    }
}
