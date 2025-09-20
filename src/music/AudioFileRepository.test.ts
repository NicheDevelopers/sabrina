import AudioFileRepository from "./AudioFileRepository";
import * as fs from "fs";

// Mock fs module
jest.mock("fs");
const mockFs = fs as jest.Mocked<typeof fs>;

describe("AudioFileRepository", () => {
    let repository: AudioFileRepository;

    beforeEach(() => {
        repository = new AudioFileRepository();

        // Reset the videos map for each test
        (repository as any).videos = new Map();

        // Clear all mocks
        jest.clearAllMocks();
    });

    describe("extractVideoIdFromFilename", () => {
        it("should extract video ID from valid mp3 filename", () => {
            const filename = "Song Title [dQw4w9WgXcQ].mp3";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBe("dQw4w9WgXcQ");
        });

        it("should extract video ID from valid m4a filename", () => {
            const filename = "Another Song [abc123def45].m4a";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBe("abc123def45");
        });

        it("should extract video ID from valid wav filename", () => {
            const filename = "Test Song [1234567890a].wav";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBe("1234567890a");
        });

        it("should extract video ID from valid ogg filename", () => {
            const filename = "Music [aBc_DeF-123].ogg";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBe("aBc_DeF-123");
        });

        it("should extract video ID from valid flac filename", () => {
            const filename = "Classical [xyz987_test].flac";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBe("xyz987_test");
        });

        it("should return null for filename without brackets", () => {
            const filename = "song.mp3";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBeNull();
        });

        it("should return null for filename with invalid video ID format", () => {
            const filename = "Song [invalid-id].mp3";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBeNull();
        });

        it("should return null for filename with video ID too short", () => {
            const filename = "Song [short].mp3";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBeNull();
        });

        it("should return null for filename with video ID too long", () => {
            const filename = "Song [toolongvideoidhere].mp3";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBeNull();
        });

        it("should return null for unsupported file extension", () => {
            const filename = "Song [dQw4w9WgXcQ].txt";
            const videoId = repository.extractVideoIdFromFilename(filename);
            expect(videoId).toBeNull();
        });
    });

    describe("getPath", () => {
        it("should return file path for registered video ID", () => {
            const videoId = "dQw4w9WgXcQ";
            const filePath = "./downloads/youtube/Song [dQw4w9WgXcQ].mp3";

            // Use registerVideo method to add the video
            (repository as any).registerVideo(videoId, filePath);

            const result = repository.getPath(videoId);
            expect(result).toBe(filePath);
        });

        it("should return null for unregistered video ID", () => {
            const result = repository.getPath("nonexistent");
            expect(result).toBeNull();
        });

        it("should return null for empty video ID", () => {
            const result = repository.getPath("");
            expect(result).toBeNull();
        });
    });

    describe("registerVideo", () => {
        it("should register new video successfully", () => {
            const videoId = "abc123def45";
            const filePath = "./downloads/youtube/Test [abc123def45].mp3";

            (repository as any).registerVideo(videoId, filePath);

            expect(repository.getPath(videoId)).toBe(filePath);
        });

        it("should skip duplicate video ID", () => {
            const videoId = "duplicate123";
            const filePath1 = "./downloads/youtube/First [duplicate123].mp3";
            const filePath2 = "./downloads/youtube/Second [duplicate123].mp3";

            // Register first video
            (repository as any).registerVideo(videoId, filePath1);
            expect(repository.getPath(videoId)).toBe(filePath1);

            // Try to register duplicate - should be skipped
            (repository as any).registerVideo(videoId, filePath2);
            expect(repository.getPath(videoId)).toBe(filePath1); // Should still be first path
        });
    });

    describe("loadVideosFromDisk", () => {
        it("should load valid audio files from disk", () => {
            const mockDirEntries = [
                "Song One [dQw4w9WgXcQ].mp3",
                "Song Two [abc123def45].m4a",
                "Song Three [xyz987test1].wav",
            ];

            mockFs.readdirSync.mockReturnValue(mockDirEntries as any);
            mockFs.statSync.mockReturnValue({ isFile: () => true } as any);

            (repository as any).loadVideosFromDisk();

            expect(repository.getPath("dQw4w9WgXcQ")).toBe(
                "downloads/youtube/Song One [dQw4w9WgXcQ].mp3"
            );
            expect(repository.getPath("abc123def45")).toBe(
                "downloads/youtube/Song Two [abc123def45].m4a"
            );
            expect(repository.getPath("xyz987test1")).toBe(
                "downloads/youtube/Song Three [xyz987test1].wav"
            );
        });

        it("should skip directories", () => {
            const mockDirEntries = ["subfolder", "Song [dQw4w9WgXcQ].mp3"];

            mockFs.readdirSync.mockReturnValue(mockDirEntries as any);
            mockFs.statSync
                .mockReturnValueOnce({ isFile: () => false } as any) // subfolder
                .mockReturnValueOnce({ isFile: () => true } as any); // mp3 file

            (repository as any).loadVideosFromDisk();

            expect(repository.getPath("dQw4w9WgXcQ")).toBe(
                "downloads/youtube/Song [dQw4w9WgXcQ].mp3"
            );
            expect((repository as any).videos.size).toBe(1);
        });

        it("should skip files with invalid filenames", () => {
            const mockDirEntries = ["invalid-file.mp3", "Valid Song [dQw4w9WgXcQ].mp3"];

            mockFs.readdirSync.mockReturnValue(mockDirEntries as any);
            mockFs.statSync.mockReturnValue({ isFile: () => true } as any);

            (repository as any).loadVideosFromDisk();

            expect(repository.getPath("dQw4w9WgXcQ")).toBe(
                "downloads/youtube/Valid Song [dQw4w9WgXcQ].mp3"
            );
            expect((repository as any).videos.size).toBe(1);
        });

        it("should handle empty directory", () => {
            mockFs.readdirSync.mockReturnValue([]);

            (repository as any).loadVideosFromDisk();

            expect((repository as any).videos.size).toBe(0);
        });
    });

    describe("init", () => {
        it("should create downloads directory if it doesn't exist", () => {
            // Mock statSync to throw an error (directory doesn't exist)
            mockFs.statSync.mockImplementation(() => {
                throw new Error("Directory doesn't exist");
            });
            mockFs.mkdirSync.mockImplementation();
            mockFs.readdirSync.mockReturnValue([]);

            repository.init();

            expect(mockFs.mkdirSync).toHaveBeenCalledWith("./downloads/youtube", {
                recursive: true,
            });
        });

        it("should not create directory if it already exists", () => {
            // Mock statSync to return successfully (directory exists)
            mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);
            mockFs.readdirSync.mockReturnValue([]);

            repository.init();

            expect(mockFs.mkdirSync).not.toHaveBeenCalled();
        });

        it("should load videos from disk after ensuring folder exists", () => {
            // Mock folder exists
            mockFs.statSync.mockReturnValue({ isDirectory: () => true } as any);

            const mockDirEntries = ["Test Song [dQw4w9WgXcQ].mp3"];
            mockFs.readdirSync.mockReturnValue(mockDirEntries as any);
            mockFs.statSync.mockReturnValue({ isFile: () => true } as any);

            repository.init();

            expect(repository.getPath("dQw4w9WgXcQ")).toBe(
                "downloads/youtube/Test Song [dQw4w9WgXcQ].mp3"
            );
        });
    });
});
