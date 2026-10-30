import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import * as fs from "node:fs";
import { VideoMetadataResult } from "yt-search";
import Db from "../../Db";
import AudioFileRepository from "../AudioFileRepository";
import YouTube from "./YouTube";
import YouTubeApi from "./YouTubeApi";
import { YtDlp } from "./YtDlp";

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  existsSync: vi.fn(),
}));

vi.mock("./YouTubeApi");
vi.mock("./YtDlp");

vi.mock("../../logging", () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("YouTube", () => {
  const videoId = "dQw4w9WgXcQ";
  const filePath = "/app/downloads/youtube/Song [dQw4w9WgXcQ].opus";
  const metadata = {
    title: "Song",
    author: { name: "Author" },
    duration: { timestamp: "3:32" },
  } as VideoMetadataResult;

  const existsSync = vi.mocked(fs.existsSync);
  const downloadAudio = vi.mocked(YtDlp.downloadAudio);

  let db: Db;
  let repository: AudioFileRepository;
  let youTube: YouTube;

  beforeEach(async () => {
    vi.clearAllMocks();
    db = new Db(":memory:");
    await db.init();
    repository = new AudioFileRepository();
    youTube = new YouTube(repository, db);

    existsSync.mockReturnValue(true);
    downloadAudio.mockResolvedValue(filePath);
    vi.mocked(YouTubeApi.fetchVideoData).mockResolvedValue(metadata);
  });

  afterEach(async () => {
    await db.close();
  });

  describe("findLocalOrDownload", () => {
    it("should download a new video", async () => {
      expect(await youTube.findLocalOrDownload(videoId)).toBe(filePath);
      expect(downloadAudio).toHaveBeenCalledTimes(1);
    });

    it("should use a file found on disk without downloading", async () => {
      await db.insertVideoData(videoId, null, metadata);
      repository.registerVideo(videoId, filePath);

      expect(await youTube.findLocalOrDownload(videoId)).toBe(filePath);
      expect(downloadAudio).not.toHaveBeenCalled();
    });

    it("should not download a video twice", async () => {
      await youTube.findLocalOrDownload(videoId);
      await youTube.findLocalOrDownload(videoId);

      expect(downloadAudio).toHaveBeenCalledTimes(1);
    });

    it("should download a video again after its file was deleted", async () => {
      await youTube.findLocalOrDownload(videoId);
      existsSync.mockReturnValue(false);

      await youTube.findLocalOrDownload(videoId);

      expect(downloadAudio).toHaveBeenCalledTimes(2);
    });

    it("should fail when the download fails", async () => {
      downloadAudio.mockResolvedValue(null);

      await expect(youTube.findLocalOrDownload(videoId)).rejects.toThrow(
        "Failed to download audio",
      );
    });
  });
});
