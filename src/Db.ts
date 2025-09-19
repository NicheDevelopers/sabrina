import {DatabaseSync} from "node:sqlite";
import {log} from "./logging.ts";
import {VideoMetadataResult} from "npm:@types/yt-search@2.10.3";
import {ChatInputCommandInteraction} from "npm:discord.js@14.22.1";

export interface VideoDataRecord {
    id: string;
    path: string | null;
    title: string | null;
    url: string | null;
    timestamp: string | null;
    seconds: number | null;
    views: number | null;
    uploadDate: string | null;
    ago: string | null;
    image: string | null;
    authorName: string | null;
    authorUrl: string | null;
}

export interface PlayLogRecord {
    id: string;
    videoId: string;
    guildId: string;
    userId: string;
    playedAt: Date;
    userName: string;
    guildName: string;
}

export default class Db {
    db: DatabaseSync;

    public constructor(databaseName: string) {
        this.db = new DatabaseSync(databaseName);
        log.info(`Database connected to ${databaseName}`);
        this.init();
    }

    private init() {
        log.info("Initializing database...");
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS yt_videos (
              id TEXT PRIMARY KEY,
              path TEXT,
              title TEXT,
              url TEXT,
              timestamp TEXT,
              seconds INTEGER,
              views INTEGER,
              uploadDate TEXT,
              ago TEXT,
              image TEXT,
              authorName TEXT,
              authorUrl TEXT
          );
      `);
        const result = this.db.prepare(`
        SELECT COUNT(*) as count FROM yt_videos;
    `).get();
        log.info(`Found ${result?.count} entries in the database.`);

        this.db.exec(`
          CREATE TABLE IF NOT EXISTS play_logs (
              id TEXT PRIMARY KEY,
              videoId TEXT,
              guildId TEXT,
              userId TEXT,
              playedAt DATETIME,
              userName TEXT,
              guildName TEXT
          );`);
    }

    public prune() {
        log.info("Pruning database...");
    }

    public insertVideoData(
        id: string,
        path: VideoDataRecord["path"],
        videoData: VideoMetadataResult | null,
    ): VideoDataRecord {
        log.debug(`Inserting video ID ${id} with path ${path} into the database.`);
        const query = `
        INSERT OR REPLACE INTO yt_videos (
          id, path, title, url, timestamp, seconds, views, 
          uploadDate, ago, image, authorName, authorUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
        const values = [
            id,
            path,
            videoData?.title ?? null,
            videoData?.url ?? null,
            videoData?.timestamp ?? null,
            videoData?.seconds ?? null,
            videoData?.views ?? null,
            videoData?.uploadDate ?? null,
            videoData?.ago ?? null,
            videoData?.image ?? null,
            videoData?.author?.name ?? null,
            videoData?.author?.url ?? null,
        ];
        this.db.prepare(query).run(...values);
        log.info(`Registered video ${id} at path ${path} in the database.`);
        return videoData as unknown as VideoDataRecord;
    }

    public getVideoRecord(id: string): VideoDataRecord | null {
        const result = this.db.prepare(`
    SELECT * FROM yt_videos WHERE id = ?;
  `).get(id);
        if (result) {
            return result as unknown as VideoDataRecord;
        } else {
            log.debug(`No entry found in database for video ID ${id}.`);
            return null;
        }
    }

    public insertPlayLog(
        videoId: string,
        interaction: ChatInputCommandInteraction,
    ) {
        const id = crypto.randomUUID();
        const playedAt = new Date();
        const userName = interaction.user.displayName;
        const guildName = interaction.guild?.name || "N/A";
        const query = `
        INSERT INTO play_logs (
          id, videoId, guildId, userId, playedAt, userName, guildName
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
        const values = [
            id,
            videoId,
            interaction.guildId,
            interaction.user.id,
            playedAt.toISOString(),
            userName,
            guildName,
        ];
        this.db.prepare(query).run(...values);
        log.debug(
            `Logged play of video ${videoId} by user ${userName} in guild ${guildName}.`,
        );
    }

    public clearDatabase() {
        log.warn("Clearing the database...");
        this.db.exec(`
    DELETE FROM yt_videos;
  `);
        log.info("Cleared the database.");
    }
}

export const sabrinaDb = new Db("sabrina.db");
