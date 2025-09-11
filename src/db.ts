import { DatabaseSync } from "node:sqlite";
import { log } from "./logging.ts";

const db = new DatabaseSync('sabrina.db');

export default class Db {
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

  /* Finds filenames in the database that are not present on disk and removes them from the database. */
  public static prune() {
    log.info("Pruning database...");
  }
}
