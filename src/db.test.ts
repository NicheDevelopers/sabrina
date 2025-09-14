import {
  assertEquals,
  assertNotEquals,
} from "https://deno.land/std/testing/asserts.ts";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "https://deno.land/std/testing/bdd.ts";
import { DatabaseSync } from "node:sqlite";
import Db from "./db.ts";

describe("Db", () => {
  // Use an in-memory database for testing
  const testDb = new DatabaseSync(":memory:");

  beforeEach(() => {
    // Set the test database
    Db.setDatabase(testDb);

    // Start a transaction before each test
    testDb.exec("BEGIN TRANSACTION;");

    // Initialize the database structure
    Db.init();
  });

  afterEach(() => {
    // Roll back the transaction after each test
    testDb.exec("ROLLBACK;");
  });

  describe("insertVideoPath", () => {
    it("should insert video path into database", () => {
      // Execute
      Db.insertVideoPath("abc123", "/videos/abc123.mp4", null);

      // Verify the record was inserted
      const result = testDb.prepare(`
      SELECT id, path FROM yt_videos WHERE id = ?;
    `).get("abc123");

      assertEquals(result?.id, "abc123");
      assertEquals(result?.path, "/videos/abc123.mp4");
    });

    it("should replace existing video path", () => {
      // Setup - insert initial record
      testDb.prepare(`
      INSERT INTO yt_videos (id, path) VALUES (?, ?);
    `).run("abc123", "/videos/old-path.mp4");

      // Execute - update with new path
      Db.insertVideoPath("abc123", "/videos/new-path.mp4", null);

      // Verify the record was updated
      const result = testDb.prepare(`
      SELECT id, path FROM yt_videos WHERE id = ?;
    `).get("abc123");

      assertEquals(result?.id, "abc123");
      assertEquals(result?.path, "/videos/new-path.mp4");
    });
  });

  describe("getVideoPath", () => {
    it("should return path for existing video ID", () => {
      // Setup
      testDb.prepare(`
      INSERT INTO yt_videos (id, path) VALUES (?, ?);
    `).run("abc123", "/videos/abc123.mp4");

      // Execute
      const path = Db.getVideoData("abc123");

      // Verify
      assertEquals(path, "/videos/abc123.mp4");
    });

    it("should return null for non-existent video ID", () => {
      // Execute
      const path = Db.getVideoData("non-existent");

      // Verify
      assertEquals(path, null);
    });

    it("should return null when path is null", () => {
      // Setup - insert record with null path
      testDb.prepare(`
      INSERT INTO yt_videos (id, path) VALUES (?, ?);
    `).run("null-path", null);

      // Execute
      const path = Db.getVideoData("null-path");

      // Verify
      assertEquals(path, null);
    });
  });

  describe("clearDatabase", () => {
    it("should delete all database entries", () => {
      // Setup - insert some records
      testDb.prepare(`
      INSERT INTO yt_videos (id, path) VALUES (?, ?);
    `).run("video1", "/path1");

      testDb.prepare(`
      INSERT INTO yt_videos (id, path) VALUES (?, ?);
    `).run("video2", "/path2");

      // Execute
      Db.clearDatabase();

      // Verify all records were deleted
      const count = testDb.prepare(`
      SELECT COUNT(*) as count FROM yt_videos;
    `).get();

      assertEquals(count?.count, 0);
    });
  });

  describe("prune", () => {
    it("should be implemented", () => {
      // This is just a placeholder test since prune() is currently empty
      Db.prune();
      // No assertions needed since the method is empty
    });
  });
});
