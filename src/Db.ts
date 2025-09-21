import sqlite3 from "sqlite3";
import {open} from "sqlite";
import {log} from "./logging";
import {VideoMetadataResult} from "yt-search";
import {ChatInputCommandInteraction} from "discord.js";
import {randomUUID} from "crypto";

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
    db: any = null;

    public constructor(private databaseName: string) {
        log.info(`Database will connect to ${databaseName}`);
    }

    public async init() {
        this.db = await open({
            filename: this.databaseName,
            driver: sqlite3.Database,
        });

        log.info(`Database connected to ${this.databaseName}`);
        await this.createTables();
    }

    private async createTables() {
        if (!this.db) throw new Error("Database not initialized");

        log.info("Initializing database...");

        await this.db.exec(
            `CREATE TABLE if NOT EXISTS yt_videos (
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

        const result = await this.db.get(`
            SELECT COUNT(*) AS COUNT
            FROM yt_videos;
        `);
        log.info(`Found ${result?.count || 0} entries in the database.`);

        await this.db.exec(`
            CREATE TABLE if NOT EXISTS play_logs (
                id
                TEXT
                PRIMARY
                KEY,
                videoId
                TEXT,
                guildId
                TEXT,
                userId
                TEXT,
                playedAt
                DATETIME,
                userName
                TEXT,
                guildName
                TEXT
            );
        `);
    }

    public async prune() {
        log.info("Pruning database...");
    }

    public async insertVideoData(
        id: string,
        path: VideoDataRecord["path"],
        videoData: VideoMetadataResult | null,
    ): Promise<VideoDataRecord> {
        if (!this.db) throw new Error("Database not initialized");

        log.debug(`Inserting video ID ${id} with path ${path} into the database.`);
        const query = `
            INSERT
            OR REPLACE INTO yt_videos (
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
        await this.db.run(query, values);
        log.info(`Registered video ${id} at path ${path} in the database.`);
        return videoData as unknown as VideoDataRecord;
    }

    public async getVideoRecord(id: string): Promise<VideoDataRecord | null> {
        if (!this.db) throw new Error("Database not initialized");

        const result = await this.db.get(
            `
                SELECT *
                FROM yt_videos
                WHERE id = ?;
            `,
            id,
        );

        if (result) {
            return result as VideoDataRecord;
        } else {
            log.debug(`No entry found in database for video ID ${id}.`);
            return null;
        }
    }

    public async insertPlayLog(
        videoId: string,
        interaction: ChatInputCommandInteraction,
    ) {
        if (!this.db) throw new Error("Database not initialized");

        const id = randomUUID();
        const playedAt = new Date();
        const userName = interaction.user.username;
        const guildName = interaction.guild?.name || "N/A";
        const query = `
            INSERT INTO play_logs (id, videoid, guildid, userid, playedat, username, guildname)
            VALUES (?, ?, ?, ?, ?, ?, ?);
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
        await this.db.run(query, values);
        log.debug(
            `Logged play of video ${videoId} by user ${userName} in guild ${guildName}.`,
        );
    }

    public async clearDatabase() {
        if (!this.db) throw new Error("Database not initialized");

        log.warn("Clearing the database...");
        await this.db.exec(`DELETE
                            FROM yt_videos;`);
        log.info("Cleared the database.");
    }
}

export const sabrinaDb = new Db("sabrina.db");