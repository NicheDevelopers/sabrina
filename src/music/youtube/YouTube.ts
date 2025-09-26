import { YtDlp } from "./YtDlp";
import AudioFileRepository, { audioFileRepository } from "../AudioFileRepository";
import Db, { sabrinaDb, VideoDataRecord } from "../../Db";
import { log } from "../../logging";
import { ParsedQuery } from "../QueryParser";
import YouTubeQueryResolver from "./YouTubeQueryResolver";
import YouTubeApi from "./YouTubeApi";

export interface VideoDataFetchError {
    videoId: string;
    error: string;
}
export interface QueryResult {
    videos: VideoDataRecord[];
    errors: VideoDataFetchError[];
}

export function isVideoDataFetchError(
    obj: VideoDataRecord | VideoDataFetchError
): obj is VideoDataFetchError {
    return (
        (obj as VideoDataFetchError).error !== undefined &&
        (obj as VideoDataFetchError).videoId !== undefined
    );
}

export default class YouTube {
    private audioRepo: AudioFileRepository;
    private db: Db;

    constructor(audioFileRepository: AudioFileRepository, Db: Db) {
        this.audioRepo = audioFileRepository;
        this.db = Db;
    }

    public async handleQuery(query: ParsedQuery): Promise<QueryResult> {
        const videoIds = await YouTubeQueryResolver.resolveToVideoIds(query);
        const videos = await this.hydrateVideoIds(videoIds);
        const errors = videos.filter(isVideoDataFetchError) as VideoDataFetchError[];
        const filteredVideos = videos.filter(
            video => !isVideoDataFetchError(video)
        ) as VideoDataRecord[];
        return { videos: filteredVideos, errors };
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

    private async hydrateVideoIds(
        videoIds: string[]
    ): Promise<(VideoDataRecord | VideoDataFetchError)[]> {
        const handleVideoId = async (id: string) => {
            let videoRecord = await this.db.getVideoRecord(id);
            if (videoRecord) {
                log.debug(`Video already exists in database: ${id}`);
                return videoRecord;
            }

            log.debug(`Fetching video data for new video: ${id}`);
            const videoData = await YouTubeApi.fetchVideoData(id);
            await this.db.insertVideoData(id, null, videoData);

            videoRecord = await this.db.getVideoRecord(id);
            if (!videoRecord) {
                log.error(`Failed to retrieve video record after insertion: ${id}`);
                throw new Error(
                    "Giga, unrecoverable error, SQLite failed, panic sell everything ~ Warren Buffett"
                );
            }
            log.info(
                `Successfully handled query for video: ${id} - "${videoData.title}" by ${videoData.author.name}`
            );
            return videoRecord;
        };

        const promises = videoIds.map(async id => {
            try {
                return await handleVideoId(id);
            } catch (error) {
                log.error(`Error handling video ID ${id}: ${error}`);
                return { videoId: id, error } as VideoDataFetchError;
            }
        });

        return await Promise.all(promises);
    }

    /* Downloads audio for a given YouTube video ID and returns the file path */
    private async downloadAudio(videoId: string): Promise<string> {
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const videoData = await YouTubeApi.fetchVideoData(videoId);

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

        await this.db.insertVideoData(videoId, filePath, videoData);
        log.info(`Audio download completed: ${videoId} saved to ${filePath}`);
        return filePath;
    }
}

export const youTube = new YouTube(audioFileRepository, sabrinaDb);
