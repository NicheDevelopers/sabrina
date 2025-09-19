import {
  assertEquals,
  assertThrows,
} from "jsr:@std/assert";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing/bdd";
import { stub, restore } from "jsr:@std/testing/mock";
import AudioFileRepository from "./AudioFileRepository.ts";

describe("AudioFileRepository", () => {
  let repository: AudioFileRepository;
  let mockDirEntries: Deno.DirEntry[];

  beforeEach(() => {
    repository = new AudioFileRepository();
    mockDirEntries = [];

    // Reset the videos map for each test
    (repository as any).videos = new Map();
  });

  afterEach(() => {
    restore();
  });

  describe("extractVideoIdFromFilename", () => {
    it("should extract video ID from valid mp3 filename", () => {
      const filename = "Song Title [dQw4w9WgXcQ].mp3";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, "dQw4w9WgXcQ");
    });

    it("should extract video ID from valid m4a filename", () => {
      const filename = "Another Song [abc123def45].m4a";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, "abc123def45");
    });

    it("should extract video ID from valid wav filename", () => {
      const filename = "Test Song [1234567890a].wav";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, "1234567890a");
    });

    it("should extract video ID from valid ogg filename", () => {
      const filename = "Music [aBc_DeF-123].ogg";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, "aBc_DeF-123");
    });

    it("should extract video ID from valid flac filename", () => {
      const filename = "Classical [xyz987_test].flac";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, "xyz987_test");
    });

    it("should return null for filename without brackets", () => {
      const filename = "song.mp3";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, null);
    });

    it("should return null for filename with invalid video ID format", () => {
      const filename = "Song [invalid-id].mp3";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, null);
    });

    it("should return null for filename with video ID too short", () => {
      const filename = "Song [short].mp3";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, null);
    });

    it("should return null for filename with video ID too long", () => {
      const filename = "Song [toolongvideoidhere].mp3";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, null);
    });

    it("should return null for unsupported file extension", () => {
      const filename = "Song [dQw4w9WgXcQ].txt";
      const videoId = repository.extractVideoIdFromFilename(filename);
      assertEquals(videoId, null);
    });
  });

  describe("getPath", () => {
    it("should return file path for registered video ID", () => {
      const videoId = "dQw4w9WgXcQ";
      const filePath = "./downloads/youtube/Song [dQw4w9WgXcQ].mp3";

      // Use registerVideo method to add the video
      (repository as any).registerVideo(videoId, filePath);

      const result = repository.getPath(videoId);
      assertEquals(result, filePath);
    });

    it("should return null for unregistered video ID", () => {
      const result = repository.getPath("nonexistent");
      assertEquals(result, null);
    });

    it("should return null for empty video ID", () => {
      const result = repository.getPath("");
      assertEquals(result, null);
    });
  });

  describe("registerVideo", () => {
    it("should register new video successfully", () => {
      const videoId = "abc123def45";
      const filePath = "./downloads/youtube/Test [abc123def45].mp3";

      (repository as any).registerVideo(videoId, filePath);

      assertEquals(repository.getPath(videoId), filePath);
    });

    it("should skip duplicate video ID", () => {
      const videoId = "duplicate123";
      const filePath1 = "./downloads/youtube/First [duplicate123].mp3";
      const filePath2 = "./downloads/youtube/Second [duplicate123].mp3";

      // Register first video
      (repository as any).registerVideo(videoId, filePath1);
      assertEquals(repository.getPath(videoId), filePath1);

      // Try to register duplicate - should be skipped
      (repository as any).registerVideo(videoId, filePath2);
      assertEquals(repository.getPath(videoId), filePath1); // Should still be first path
    });
  });

  describe("loadVideosFromDisk", () => {
    beforeEach(() => {
      // Mock Deno.readDirSync to return our test entries as an iterable
      stub(Deno, "readDirSync", () => mockDirEntries as any);
    });

    it("should load valid audio files from disk", () => {
      mockDirEntries = [
        { name: "Song One [dQw4w9WgXcQ].mp3", isFile: true, isDirectory: false, isSymlink: false },
        { name: "Song Two [abc123def45].m4a", isFile: true, isDirectory: false, isSymlink: false },
        { name: "Song Three [xyz987test1].wav", isFile: true, isDirectory: false, isSymlink: false },
      ];

      (repository as any).loadVideosFromDisk();

      assertEquals(repository.getPath("dQw4w9WgXcQ"), "./downloads/youtube/Song One [dQw4w9WgXcQ].mp3");
      assertEquals(repository.getPath("abc123def45"), "./downloads/youtube/Song Two [abc123def45].m4a");
      assertEquals(repository.getPath("xyz987test1"), "./downloads/youtube/Song Three [xyz987test1].wav");
    });

    it("should skip directories", () => {
      mockDirEntries = [
        { name: "subfolder", isFile: false, isDirectory: true, isSymlink: false },
        { name: "Song [dQw4w9WgXcQ].mp3", isFile: true, isDirectory: false, isSymlink: false },
      ];

      (repository as any).loadVideosFromDisk();

      assertEquals(repository.getPath("dQw4w9WgXcQ"), "./downloads/youtube/Song [dQw4w9WgXcQ].mp3");
      assertEquals((repository as any).videos.size, 1);
    });

    it("should skip files with invalid filenames", () => {
      mockDirEntries = [
        { name: "invalid-file.mp3", isFile: true, isDirectory: false, isSymlink: false },
        { name: "Song [invalid].mp3", isFile: true, isDirectory: false, isSymlink: false },
        { name: "Valid Song [dQw4w9WgXcQ].mp3", isFile: true, isDirectory: false, isSymlink: false },
      ];

      (repository as any).loadVideosFromDisk();

      assertEquals((repository as any).videos.size, 1);
      assertEquals(repository.getPath("dQw4w9WgXcQ"), "./downloads/youtube/Valid Song [dQw4w9WgXcQ].mp3");
    });

    it("should skip files without video ID match", () => {
      mockDirEntries = [
        { name: "Song [].mp3", isFile: true, isDirectory: false, isSymlink: false },
        { name: "Song.mp3", isFile: true, isDirectory: false, isSymlink: false },
      ];

      (repository as any).loadVideosFromDisk();

      assertEquals((repository as any).videos.size, 0);
    });
  });

  describe("init", () => {
    it("should create audio folder if it doesn't exist", () => {
      // Mock Deno.statSync to throw (folder doesn't exist)
      const statStub = stub(Deno, "statSync", () => {
        throw new Error("Directory not found");
      });

      // Mock Deno.mkdirSync
      const mkdirStub = stub(Deno, "mkdirSync", () => {});

      // Mock Deno.readDirSync for loadVideosFromDisk
      const readDirStub = stub(Deno, "readDirSync", () => [] as any);

      repository.init();

      // Verify mkdir was called
      assertEquals(mkdirStub.calls.length, 1);
      assertEquals(mkdirStub.calls[0].args[0], AudioFileRepository.audioFolderPath);
    });

    it("should not create audio folder if it already exists", () => {
      // Mock Deno.statSync to succeed (folder exists)
      const statStub = stub(Deno, "statSync", () => ({
        isFile: false,
        isDirectory: true,
        isSymlink: false,
        size: 0,
        mtime: new Date(),
        atime: new Date(),
        birthtime: new Date(),
        ctime: new Date(),
        dev: 1,
        ino: 1,
        mode: 0o755,
        nlink: 1,
        uid: 1000,
        gid: 1000,
        rdev: 0,
        blksize: 4096,
        blocks: 0,
        isBlockDevice: false,
        isCharDevice: false,
        isFifo: false,
        isSocket: false,
      } as Deno.FileInfo));

      // Mock Deno.mkdirSync
      const mkdirStub = stub(Deno, "mkdirSync", () => {});

      // Mock Deno.readDirSync for loadVideosFromDisk
      const readDirStub = stub(Deno, "readDirSync", () => [] as any);

      repository.init();

      // Verify mkdir was NOT called
      assertEquals(mkdirStub.calls.length, 0);
    });

    it("should load videos from disk after ensuring folder exists", () => {
      // Mock folder exists
      stub(Deno, "statSync", () => ({
        isFile: false,
        isDirectory: true,
        isSymlink: false,
      } as any));

      // Mock directory with test files
      const testEntries = [
        { name: "Test Song [dQw4w9WgXcQ].mp3", isFile: true, isDirectory: false, isSymlink: false },
      ];
      stub(Deno, "readDirSync", () => testEntries as any);

      repository.init();

      assertEquals(repository.getPath("dQw4w9WgXcQ"), "./downloads/youtube/Test Song [dQw4w9WgXcQ].mp3");
    });
  });

  describe("static properties", () => {
    it("should have correct audioFolderPath", () => {
      assertEquals(AudioFileRepository.audioFolderPath, "./downloads/youtube");
    });

    it("should have correct songRegex pattern", () => {
      const regex = (AudioFileRepository as any).songRegex;

      // Test valid matches
      assertEquals(regex.test("[dQw4w9WgXcQ].mp3"), true);
      assertEquals(regex.test("[abc123def45].m4a"), true);
      assertEquals(regex.test("[xyz987_test].wav"), true);
      assertEquals(regex.test("[aBc-DeF_123].ogg"), true);
      assertEquals(regex.test("[1234567890a].flac"), true);

      // Test invalid matches
      assertEquals(regex.test("invalid.mp3"), false);
      assertEquals(regex.test("[short].mp3"), false);
      assertEquals(regex.test("[toolongvideoid].mp3"), false);
      assertEquals(regex.test("[dQw4w9WgXcQ].txt"), false);
    });
  });
});
