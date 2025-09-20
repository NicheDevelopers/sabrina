import { assertEquals } from "jsr:@std/assert";
import {
    afterEach,
    beforeEach,
    describe,
    it,
} from "https://deno.land/std/testing/bdd.ts";
import Db from "./Db.ts";
import { VideoMetadataResult } from "npm:@types/yt-search@2.10.3";

describe("Db", () => {
    // Use an in-memory database for testing
    let db: Db;

    beforeEach(() => {
        // Create a new Db instance with in-memory database
        db = new Db(":memory:");
    });

    afterEach(() => {
        // Close the database to prevent leaks
        if (db && db.db) {
            try {
                db.db.close();
            } catch (_e) {
                // Ignore errors on close
            }
        }
    });

    describe("insertVideoPath", () => {
        it("should insert video path into database", () => {
            // Execute
            db.insertVideoData("abc123", "/videos/abc123.mp4", null);

            // Verify the record was inserted
            const result = db.getVideoRecord("abc123");

            assertEquals(result?.id, "abc123");
            assertEquals(result?.path, "/videos/abc123.mp4");
        });

        it("should replace existing video path", () => {
            // Setup - insert initial record
            db.insertVideoData("abc123", "/videos/old-path.mp4", null);

            // Execute - update with new path
            db.insertVideoData("abc123", "/videos/new-path.mp4", null);

            // Verify the record was updated
            const result = db.getVideoRecord("abc123");

            assertEquals(result?.id, "abc123");
            assertEquals(result?.path, "/videos/new-path.mp4");
        });
    });

    describe("getVideoData", () => {
        it("should return full data for existing video ID", () => {
            // Setup - create a record with title
            const videoData: VideoMetadataResult = {
                title: "Test Video",
                url: "https://example.com/video",
                videoId: "abc123",
                timestamp: "2:00",
                seconds: 120,
                views: 1000,
                genre: "Music",
                uploadDate: "2023-01-01",
                ago: "1 year ago",
                image: "https://example.com/image.jpg",
                thumbnail: "https://example.com/thumbnail.jpg",
                description: "Test description",
                author: {
                    name: "Test Author",
                    url: "https://example.com/author",
                },
                duration: {
                    seconds: 120,
                    timestamp: "2:00",
                    toString: () => "2:00",
                },
            };

            db.insertVideoData("abc123", "/videos/abc123.mp4", videoData);

            // Execute
            const data = db.getVideoRecord("abc123");

            // Verify
            assertEquals(data?.id, "abc123");
            assertEquals(data?.path, "/videos/abc123.mp4");
            assertEquals(data?.title, "Test Video");
        });

        it("should return null for non-existent video ID", () => {
            // Execute
            const data = db.getVideoRecord("non-existent");

            // Verify
            assertEquals(data, null);
        });
    });

    describe("clearDatabase", () => {
        it("should delete all database entries", () => {
            // Setup - insert some records
            db.insertVideoData("video1", "/path1", null);
            db.insertVideoData("video2", "/path2", null);

            // Execute
            db.clearDatabase();

            // Verify all records were deleted
            const data1 = db.getVideoRecord("video1");
            const data2 = db.getVideoRecord("video2");

            assertEquals(data1, null);
            assertEquals(data2, null);
        });
    });

    describe("prune", () => {
        it("should be implemented", () => {
            // This is just a placeholder test since prune() is currently empty
            db.prune();
            // No assertions needed since the method is empty
        });
    });
});
