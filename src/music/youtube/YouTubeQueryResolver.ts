import { ParsedQuery, QueryKind } from "../QueryParser";
import UrlValidator from "../UrlValidator";
import YouTubeApi from "./YouTubeApi";
import { log } from "../../logging";

export default class YouTubeQueryResolver {
    static async resolveToVideoIds(query: ParsedQuery): Promise<string[]> {
        if (query.type === QueryKind.YT_URL) {
            const videoId = UrlValidator.extractVideoId(new URL(query.payload));
            return [videoId];
        } else if (query.type === QueryKind.YT_SEARCH) {
            const searchResults = await YouTubeApi.fetchSearchResults(query.payload);
            const videoId = searchResults.videos.map(video => video.videoId).at(0);
            return videoId ? [videoId] : [];
        } else if (query.type === QueryKind.YT_PLAYLIST) {
            const playlistData = await YouTubeApi.fetchPlaylistData(query.payload);
            return playlistData.videos.map(video => video.videoId);
        } else {
            log.error(`Unknown query type: ${query.type}`);
            throw new Error("Unknown query type");
        }
    }
}
