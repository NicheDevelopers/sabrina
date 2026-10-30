import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";
import { log } from "./logging";
import { VideoMetadataResult } from "yt-search";
import { ChatInputCommandInteraction } from "discord.js";
import { randomUUID } from "node:crypto";
import { VoiceStateChange } from "./analytics/analytics";

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

export interface MessageLogRecord {
  id: string;
  userId: string;
  userName: string;
  channelId: string;
  channelName: string;
  guildId: string;
  guildName: string;
  contentLength: number;
  attachmentCount: number;
  hasEmbed: boolean;
  isReply: boolean;
  repliedToUserId: string | null;
  messageType: string;
  timestamp: string;
}

export default class Db {
  db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

  public constructor(private readonly databaseName: string) {
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

    await this.db.exec(`
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

    const result = await this.db.get<{ count: number }>(`
            SELECT COUNT(*) AS count
            FROM yt_videos;
        `);
    log.info(`Found ${result?.count || 0} entries in the database.`);

    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS play_analytics (
                id TEXT PRIMARY KEY,
                videoId TEXT,
                guildId TEXT,
                userId TEXT,
                playedAt DATETIME,
                userName TEXT,
                guildName TEXT
            );
        `);

    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS voice_state_analytics (
                id TEXT PRIMARY KEY,
                userId TEXT,
                username TEXT,
                kind TEXT,
                channelId TEXT,
                channelName TEXT,
                guildId TEXT,
                guildName TEXT,
                timestamp DATETIME
            );
        `);

    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS message_analytics (
                id TEXT PRIMARY KEY,
                userId TEXT,
                userName TEXT,
                channelId TEXT,
                channelName TEXT,
                guildId TEXT,
                guildName TEXT,
                contentLength INTEGER,
                attachmentCount INTEGER,
                hasEmbed INTEGER,
                isReply INTEGER,
                repliedToUserId TEXT,
                messageType TEXT,
                timestamp DATETIME
            );
        `);
  }

  public async close() {
    if (!this.db) return;

    await this.db.close();
    this.db = null;
    log.info("Database closed.");
  }

  public async insertVideoData(
    id: string,
    path: VideoDataRecord["path"],
    videoData: VideoMetadataResult | null,
  ): Promise<void> {
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
  }

  public async getVideoRecord(id: string): Promise<VideoDataRecord | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.get<VideoDataRecord>(
      `
                SELECT *
                FROM yt_videos
                WHERE id = ?;
            `,
      id,
    );

    if (result) {
      return result;
    } else {
      log.debug(`No entry found in database for video ID ${id}.`);
      return null;
    }
  }

  public async insertPlayLog(videoId: string, interaction: ChatInputCommandInteraction) {
    if (!this.db) throw new Error("Database not initialized");

    const id = randomUUID();
    const playedAt = new Date();
    const userName = interaction.user.username;
    const guildName = interaction.guild?.name || "unknown";
    const query = `
            INSERT INTO play_analytics (id, videoId, guildId, userId, playedAt, userName, guildName)
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
    log.debug(`Logged play of video ${videoId} by user ${userName} in guild ${guildName}.`);
  }

  public async insertVoiceStateLog(voiceStateChange: VoiceStateChange) {
    if (!this.db) throw new Error("Database not initialized");

    voiceStateChange.id = randomUUID();
    const query = `
            INSERT INTO voice_state_analytics (id, userId, username, kind, channelId, channelName, guildId, guildName, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
    const values = [
      voiceStateChange.id,
      voiceStateChange.userId,
      voiceStateChange.username,
      voiceStateChange.kind,
      voiceStateChange.channelId,
      voiceStateChange.channelName,
      voiceStateChange.guildId,
      voiceStateChange.guildName,
      voiceStateChange.timestamp.toISOString(),
    ];
    await this.db.run(query, values);

    log.debug(
      `Logged voice state change of user ${voiceStateChange.username} (${voiceStateChange.userId}) - ${voiceStateChange.kind} in channel ${voiceStateChange.channelName} (${voiceStateChange.channelId})`,
    );
  }

  public async insertMessageLog(record: MessageLogRecord) {
    if (!this.db) throw new Error("Database not initialized");

    const query = `
            INSERT INTO message_analytics (
                id, userId, userName, channelId, channelName,
                guildId, guildName, contentLength, attachmentCount,
                hasEmbed, isReply, repliedToUserId, messageType, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        `;
    const values = [
      record.id,
      record.userId,
      record.userName,
      record.channelId,
      record.channelName,
      record.guildId,
      record.guildName,
      record.contentLength,
      record.attachmentCount,
      record.hasEmbed ? 1 : 0,
      record.isReply ? 1 : 0,
      record.repliedToUserId,
      record.messageType,
      record.timestamp,
    ];
    await this.db.run(query, values);

    log.debug(
      `Logged message from ${record.userName} in #${record.channelName} (${record.contentLength} chars, ${record.attachmentCount} attachments)`,
    );
  }
}

export const sabrinaDb = new Db("sabrina.db");
