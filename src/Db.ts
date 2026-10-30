import { DatabaseSync } from "node:sqlite";
import { log } from "./logging";
import { ChatInputCommandInteraction } from "discord.js";
import { randomUUID } from "node:crypto";
import type { VoiceStateChange } from "./analytics/analytics";

export interface VideoDataRecord {
  id: string;
  path: string | null;
  title: string | null;
  url: string | null;
  timestamp: string | null;
  seconds: number | null;
  views: number | null;
  uploadDate: string | null;
  image: string | null;
  authorName: string | null;
  authorUrl: string | null;
}

export type VideoMetadata = Omit<VideoDataRecord, "path">;

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
  db: DatabaseSync | null = null;

  private readonly databaseName: string;

  public constructor(databaseName: string) {
    this.databaseName = databaseName;
    log.info(`Database will connect to ${databaseName}`);
  }

  public init() {
    this.db = new DatabaseSync(this.databaseName);

    log.info(`Database connected to ${this.databaseName}`);
    this.createTables();
  }

  private createTables() {
    if (!this.db) throw new Error("Database not initialized");

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
                image TEXT,
                authorName TEXT,
                authorUrl TEXT
            );
        `);

    const result = this.db
      .prepare(`
            SELECT COUNT(*) AS count
            FROM yt_videos;
        `)
      .get() as { count: number } | undefined;
    log.info(`Found ${result?.count || 0} entries in the database.`);

    this.db.exec(`
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

    this.db.exec(`
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

    this.db.exec(`
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

  public close() {
    if (!this.db) return;

    this.db.close();
    this.db = null;
    log.info("Database closed.");
  }

  /* Saves a video unless it is already known, keeping any downloaded file path */
  public insertVideo(video: VideoMetadata): void {
    if (!this.db) throw new Error("Database not initialized");

    const query = `
            INSERT INTO yt_videos (
                id, title, url, timestamp, seconds, views,
                uploadDate, image, authorName, authorUrl
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING;
        `;
    const values = [
      video.id,
      video.title,
      video.url,
      video.timestamp,
      video.seconds,
      video.views,
      video.uploadDate,
      video.image,
      video.authorName,
      video.authorUrl,
    ];
    this.db.prepare(query).run(...values);
  }

  public setVideoPath(id: string, path: string): void {
    if (!this.db) throw new Error("Database not initialized");

    this.db
      .prepare(`
                INSERT INTO yt_videos (id, path) VALUES (?, ?)
                ON CONFLICT(id) DO UPDATE SET path = excluded.path;
            `)
      .run(id, path);
    log.info(`Registered video ${id} at path ${path} in the database.`);
  }

  public getVideoRecord(id: string): VideoDataRecord | null {
    if (!this.db) throw new Error("Database not initialized");

    const result = this.db
      .prepare(`
                SELECT *
                FROM yt_videos
                WHERE id = ?;
            `)
      .get(id) as VideoDataRecord | undefined;

    if (result) {
      return result;
    } else {
      log.debug(`No entry found in database for video ID ${id}.`);
      return null;
    }
  }

  public insertPlayLog(videoId: string, interaction: ChatInputCommandInteraction) {
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
    this.db.prepare(query).run(...values);
    log.debug(`Logged play of video ${videoId} by user ${userName} in guild ${guildName}.`);
  }

  public insertVoiceStateLog(voiceStateChange: VoiceStateChange) {
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
    this.db.prepare(query).run(...values);

    log.debug(
      `Logged voice state change of user ${voiceStateChange.username} (${voiceStateChange.userId}) - ${voiceStateChange.kind} in channel ${voiceStateChange.channelName} (${voiceStateChange.channelId})`,
    );
  }

  public insertMessageLog(record: MessageLogRecord) {
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
    this.db.prepare(query).run(...values);

    log.debug(
      `Logged message from ${record.userName} in #${record.channelName} (${record.contentLength} chars, ${record.attachmentCount} attachments)`,
    );
  }
}

export const sabrinaDb = new Db("sabrina.db");
