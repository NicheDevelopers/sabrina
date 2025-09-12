import { DatabaseSync } from "node:sqlite";
import { log } from "./logging.ts";
import {VideoMetadataResult} from "npm:@types/yt-search@2.10.3";

// Default database connection
let db = new DatabaseSync('sabrina.db');

export default class Db {

  // Allow setting a different database for testing
  public static setDatabase(database: DatabaseSync) {
    db = database;
  }

  public static init() {
    log.info("Initializing database...");
    db.exec(
      `
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
      `
    );
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM yt_videos;
    `).get();
    log.info(`Found ${result?.count} entries in the database.`);
  }

  public static prune() {
    log.info("Pruning database...");
  }

  public static insertVideoPath(id: string, path: string, videoData: VideoMetadataResult | null) {
    log.debug(`Inserting video ID ${id} with path ${path} into the database.`);
    const query = `
        INSERT OR REPLACE INTO yt_videos (
          id, path, title, url, timestamp, seconds, views, 
          uploadDate, ago, image, authorName, authorUrl
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const values = [
      id, path, videoData?.title ?? null, videoData?.url ?? null,
      videoData?.timestamp ?? null, videoData?.seconds ?? null,
      videoData?.views ?? null, videoData?.uploadDate ?? null,
      videoData?.ago ?? null, videoData?.image ?? null,
      videoData?.author?.name ?? null, videoData?.author?.url ?? null
    ];
    db.prepare(query).run(...values);
    log.info(`Registered video ${id} at path ${path} in the database.`);
  }

  public static getVideoPath(id: string): string | null {
    const result = db.prepare(`
    SELECT path FROM yt_videos WHERE id = ?;
  `).get(id);
    if (result) {
      const path = result.path;
      if (!path) {
        log.error(`Database entry for video ID ${id} has no path.`);
        return null;
      }
      return path.toString();
    } else {
      return null;
    }
  }

  public static clearDatabase() {
    log.warn("Clearing the database...");
    db.exec(`
    DELETE FROM yt_videos;
  `);
    log.info("Cleared the database.");
  }
}