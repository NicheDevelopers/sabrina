import { log } from "../logging.ts";

export default class AudioFileRepository {
    public static readonly audioFolderPath = "./downloads/youtube";

    private static readonly songRegex =
        /\[([a-zA-Z0-9_-]{11})\]\.(mp3|m4a|wav|ogg|flac)$/;

    private videos: Map<string, string> = new Map(); // videoId -> filePath

    private loadVideosFromDisk() {
        log.info("Loading audio files from disk...");
        for (
            const dirEntry of Deno.readDirSync(AudioFileRepository.audioFolderPath)
        ) {
            if (
                dirEntry.isFile && dirEntry.name.match(AudioFileRepository.songRegex)
            ) {
                const videoId = this.extractVideoIdFromFilename(dirEntry.name);
                if (!videoId) {
                    log.warn(
                        `Could not extract video ID from filename: ${dirEntry.name}`,
                    );
                    continue;
                }
                const filePath =
                    `${AudioFileRepository.audioFolderPath}/${dirEntry.name}`;
                this.registerVideo(videoId, filePath);
            }
        }
        log.info(`Registered ${this.videos.size} audio files from disk.`);
    }

    private registerVideo(videoId: string, filePath: string) {
        if (this.videos.has(videoId)) {
            log.warn(
                `Skipping duplicate video ID detected in repository at ${filePath}: ${videoId}`,
            );
            return;
        }
        log.debug(
            `Registering audio file for video ID ${videoId} at path: ${filePath}`,
        );
        this.videos.set(videoId, filePath);
    }

    public getPath(videoId: string): string | null {
        return this.videos.get(videoId) || null;
    }

    public extractVideoIdFromFilename(filename: string): string | null {
        const match = filename.match(AudioFileRepository.songRegex);
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
