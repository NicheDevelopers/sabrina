import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import Db, { VideoMetadata } from "./Db";

vi.mock("./logging", () => ({
  log: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("Db", () => {
  const video: VideoMetadata = {
    id: "abc123",
    title: "Test Video",
    url: "https://example.com/video",
    timestamp: "2:00",
    seconds: 120,
    views: 1000,
    uploadDate: "2023-01-01",
    image: "https://example.com/image.jpg",
    authorName: "Test Author",
    authorUrl: "https://example.com/author",
  };

  let db: Db;

  beforeEach(async () => {
    db = new Db(":memory:");
    await db.init();
  });

  afterEach(async () => {
    await db.close();
  });

  describe("insertVideo", () => {
    it("should store the video metadata", async () => {
      await db.insertVideo(video);

      expect(await db.getVideoRecord("abc123")).toEqual({ ...video, path: null });
    });

    it("should keep the downloaded file when saving a known video again", async () => {
      await db.insertVideo(video);
      await db.setVideoPath("abc123", "/videos/abc123.opus");

      await db.insertVideo({ ...video, title: "New Title" });

      const record = await db.getVideoRecord("abc123");
      expect(record?.path).toBe("/videos/abc123.opus");
      expect(record?.title).toBe("Test Video");
    });
  });

  describe("setVideoPath", () => {
    it("should keep the metadata", async () => {
      await db.insertVideo(video);

      await db.setVideoPath("abc123", "/videos/abc123.opus");

      expect(await db.getVideoRecord("abc123")).toEqual({
        ...video,
        path: "/videos/abc123.opus",
      });
    });

    it("should create a record for an unknown video", async () => {
      await db.setVideoPath("abc123", "/videos/abc123.opus");

      const record = await db.getVideoRecord("abc123");
      expect(record?.path).toBe("/videos/abc123.opus");
    });
  });

  describe("getVideoRecord", () => {
    it("should return null for non-existent video ID", async () => {
      expect(await db.getVideoRecord("non-existent")).toBeNull();
    });
  });

  describe("close", () => {
    it("should refuse queries after closing", async () => {
      await db.close();

      await expect(db.getVideoRecord("abc123")).rejects.toThrow("Database not initialized");
    });

    it("should do nothing when the database is not open", async () => {
      await db.close();

      await expect(db.close()).resolves.toBeUndefined();
    });
  });
});
