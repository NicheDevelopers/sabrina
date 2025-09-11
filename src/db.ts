import { DatabaseSync } from "node:sqlite";
import { log } from "./logging.ts";

const db = new DatabaseSync('sabrina.db');

export function initDb() {
  log.info("Initializing database...");
  db.exec(
    `
    CREATE TABLE IF NOT EXISTS yt_videos (
        id TEXT PRIMARY KEY,
        path TEXT
      );
    `
  );
  const result: any = db.prepare(`
    SELECT COUNT(*) as count FROM yt_videos;
  `).get();
  log.info(`Found ${result.count} entries in the database.`);
}

/* Finds filenames in the database that are not present on disk and removes them from the database. */
export function pruneDb() {
  log.info("Pruning database...");
}