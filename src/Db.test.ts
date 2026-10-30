import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import Db, { type VideoMetadata } from "./Db";

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

  beforeEach(() => {
    db = new Db(":memory:");
    db.init();
  });

  afterEach(() => {
    db.close();
  });

  describe("insertVideo", () => {
    it("should store the video metadata", () => {
      db.insertVideo(video);

      expect(db.getVideoRecord("abc123")).toEqual({ ...video, path: null });
    });

    it("should keep the downloaded file when saving a known video again", () => {
      db.insertVideo(video);
      db.setVideoPath("abc123", "/videos/abc123.opus");

      db.insertVideo({ ...video, title: "New Title" });

      const record = db.getVideoRecord("abc123");
      expect(record?.path).toBe("/videos/abc123.opus");
      expect(record?.title).toBe("Test Video");
    });
  });

  describe("setVideoPath", () => {
    it("should keep the metadata", () => {
      db.insertVideo(video);

      db.setVideoPath("abc123", "/videos/abc123.opus");

      expect(db.getVideoRecord("abc123")).toEqual({
        ...video,
        path: "/videos/abc123.opus",
      });
    });

    it("should create a record for an unknown video", () => {
      db.setVideoPath("abc123", "/videos/abc123.opus");

      const record = db.getVideoRecord("abc123");
      expect(record?.path).toBe("/videos/abc123.opus");
    });
  });

  describe("getVideoRecord", () => {
    it("should return null for non-existent video ID", () => {
      expect(db.getVideoRecord("non-existent")).toBeNull();
    });
  });

  describe("close", () => {
    it("should refuse queries after closing", () => {
      db.close();

      expect(() => db.getVideoRecord("abc123")).toThrow("Database not initialized");
    });

    it("should do nothing when the database is not open", () => {
      db.close();

      expect(() => db.close()).not.toThrow();
    });
  });
});
