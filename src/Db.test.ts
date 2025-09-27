import Db from "./Db";
import { VideoMetadataResult } from "yt-search";

// Mock the logging module to prevent log output during tests
jest.mock("./logging", () => ({
    log: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe("Db", () => {
    // Use an in-memory database for testing
    let db: Db;

    beforeEach(async () => {
        // Create a new Db instance with in-memory database
        db = new Db(":memory:");
        await db.init();
    });

    afterEach(async () => {
        // Close the database to prevent leaks
        if (db && db.db) {
            try {
                await db.db.close();
            } catch (error) {
                console.error("Failed to close the database after test", error);
            }
        }
    });

    describe("insertVideoPath", () => {
        it("should insert video path into database", async () => {
            // Execute
            await db.insertVideoData("abc123", "/videos/abc123.mp4", null);

            // Verify the record was inserted
            const result = await db.getVideoRecord("abc123");

            expect(result?.id).toBe("abc123");
            expect(result?.path).toBe("/videos/abc123.mp4");
        });

        it("should replace existing video path", async () => {
            // Setup - insert initial record
            await db.insertVideoData("abc123", "/videos/old-path.mp4", null);

            // Execute - update with new path
            await db.insertVideoData("abc123", "/videos/new-path.mp4", null);

            // Verify the record was updated
            const result = await db.getVideoRecord("abc123");

            expect(result?.id).toBe("abc123");
            expect(result?.path).toBe("/videos/new-path.mp4");
        });
    });

    describe("getVideoData", () => {
        it("should return full data for existing video ID", async () => {
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

            await db.insertVideoData("abc123", "/videos/abc123.mp4", videoData);

            // Execute
            const data = await db.getVideoRecord("abc123");

            // Verify
            expect(data?.id).toBe("abc123");
            expect(data?.path).toBe("/videos/abc123.mp4");
            expect(data?.title).toBe("Test Video");
        });

        it("should return null for non-existent video ID", async () => {
            // Execute
            const data = await db.getVideoRecord("non-existent");

            // Verify
            expect(data).toBeNull();
        });
    });

    describe("clearDatabase", () => {
        it("should delete all database entries", async () => {
            // Setup - insert some records
            await db.insertVideoData("video1", "/path1", null);
            await db.insertVideoData("video2", "/path2", null);

            // Execute
            await db.clearDatabase();

            // Verify all records were deleted
            const data1 = await db.getVideoRecord("video1");
            const data2 = await db.getVideoRecord("video2");

            expect(data1).toBeNull();
            expect(data2).toBeNull();
        });
    });

    describe("prune", () => {
        it("should be implemented", async () => {
            // This is just a placeholder test since prune() is currently empty
            await db.prune();
            // No assertions needed since the method is empty
        });
    });
});
