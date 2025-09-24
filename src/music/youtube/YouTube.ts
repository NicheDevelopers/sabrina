import yts, {
    PlaylistMetadataResult,
    SearchResult,
    VideoMetadataResult,
} from "yt-search";
import { YtDlp } from "./YtDlp";
import AudioFileRepository, { audioFileRepository } from "../AudioFileRepository";
import Db, { sabrinaDb, VideoDataRecord } from "../../Db";
import { log } from "../../logging";
import { ParsedQuery, QueryKind } from "../QueryParser";
import UrlValidator from "../UrlValidator";

export default class YouTube {
    private audioRepo: AudioFileRepository;
    private db: Db;

    constructor(audioFileRepository: AudioFileRepository, Db: Db) {
        this.audioRepo = audioFileRepository;
        this.db = Db;
    }

    private async resolveQueryToVideoId(query: ParsedQuery): Promise<string> {
        log.debug(`Resolving query to video ID: ${JSON.stringify(query)}`);
        let videoId: string | null = null;

        if (query.type === QueryKind.YT_URL) {
            videoId = UrlValidator.extractVideoId(new URL(query.payload));
            log.debug(`Extracted video ID from URL: ${videoId}`);
        } else if (query.type === QueryKind.YT_SEARCH) {
            const video = await this.fetchFirstVideoBySearch(query.payload);
            videoId = video?.videoId || null;
            if (videoId) {
                log.debug(`Found video from search: ${videoId} - "${video?.title}"`);
            }
        }

        if (!videoId) {
            log.error(`Failed to resolve query to video ID: ${JSON.stringify(query)}`);
            throw new Error("Could not resolve query to a video ID");
        }
        return videoId;
    }

    public async handleQuery(query: ParsedQuery): Promise<VideoDataRecord> {
        const videoId = await this.resolveQueryToVideoId(query);

        let videoRecord = await this.db.getVideoRecord(videoId);
        if (videoRecord) {
            log.debug(`Video already exists in database: ${videoId}`);
            return videoRecord;
        }

        log.debug(`Fetching video data for new video: ${videoId}`);
        const videoData = await this.fetchVideoData(videoId);
        await this.db.insertVideoData(videoId, null, videoData);

        videoRecord = await this.db.getVideoRecord(videoId);
        if (!videoRecord) {
            log.error(`Failed to retrieve video record after insertion: ${videoId}`);
            throw new Error(
                "Giga, unrecoverable error, SQLite failed, fucking panic sell everything right now ~ Warren Buffett"
            );
        }

        log.info(
            `Successfully handled query for video: ${videoId} - "${videoData.title}" by ${videoData.author.name}`
        );
        return videoRecord;
    }

    public async download(videoId: string): Promise<VideoDataRecord> {
        log.debug(`Download requested for video: ${videoId}`);
        await this.findLocalOrDownload(videoId);

        const videoData = await this.db.getVideoRecord(videoId);
        if (!videoData) {
            log.error(`Video data not found after download: ${videoId}`);
            throw new Error("Video data not found in database after download");
        }

        log.info(`Download completed for video: ${videoId}`);
        return videoData;
    }

    /* Finds audio file path in repository or downloads it if not found */
    public async findLocalOrDownload(videoId: string): Promise<string> {
        const existingRecord = await this.db.getVideoRecord(videoId);
        if (!existingRecord) {
            log.debug(`No database record found, downloading: ${videoId}`);
            return await this.downloadAudio(videoId);
        }

        log.debug(`Database record found, verifying file exists: ${videoId}`);
        const pathFromDisk = this.audioRepo.getPath(existingRecord.id);

        if (!pathFromDisk) {
            log.warn(`Audio file missing from disk, downloading: ${videoId}`);
            return await this.downloadAudio(videoId);
        }

        log.debug(`Audio file found on disk: ${videoId} at ${pathFromDisk}`);
        return pathFromDisk;
    }

    /* Downloads audio for a given YouTube video ID and returns the file path */
    private async downloadAudio(videoId: string): Promise<string> {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const videoData = await this.fetchVideoData(videoId);

        log.info(
            `Starting audio download: ${videoId} - "${videoData.title}" by ${videoData.author.name} (${videoData.duration.timestamp})`
        );

        const filePath = await YtDlp.downloadAudio(
            url,
            AudioFileRepository.audioFolderPath
        );

        if (!filePath) {
            log.error(`Audio download failed: ${videoId}`);
            throw new Error("Failed to download audio");
        }

        this.db.insertVideoData(videoId, filePath, videoData);
        log.info(`Audio download completed: ${videoId} saved to ${filePath}`);
        return filePath;
    }

    private async fetchFirstVideoBySearch(
        query: string
    ): Promise<VideoMetadataResult | null> {
        log.debug(`Searching YouTube for: ${query}`);
        const results = await yts.search(query);
        const firstVideo = results.videos[0];
        const firstVideoAdapted: VideoMetadataResult = {
            ...firstVideo,
            genre: "",
            uploadDate: "",
            thumbnail: "",
        };

        if (firstVideoAdapted) {
            log.debug(
                `Search result found: ${firstVideoAdapted.videoId} - "${firstVideoAdapted.title}"`
            );
        } else {
            log.warn(`No video results found for search: ${query}`);
        }

        return firstVideoAdapted || null;
    }

    public async fetchSearchResults(query: string): Promise<SearchResult> {
        log.debug(`Fetching search results for: ${query}`);
        return await yts.search(query);
    }

    public async fetchVideoData(videoId: string): Promise<VideoMetadataResult> {
        log.debug(`Fetching video metadata: ${videoId}`);
        return await yts.search({ videoId });
    }

    public async fetchPlaylistData(listId: string): Promise<PlaylistMetadataResult> {
        log.debug(`Fetching playlist metadata: ${listId}`);
        return await yts.search({ listId });
    }
}

export const youTube = new YouTube(audioFileRepository, sabrinaDb);
