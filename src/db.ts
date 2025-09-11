import { DatabaseSync } from "node:sqlite";
import { log } from "./logging.ts";

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
      path TEXT
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

  public static insertVideoPath(id: string, path: string) {
    db.prepare(`
    INSERT OR REPLACE INTO yt_videos (id, path) VALUES (?, ?);
  `).run(id, path);
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