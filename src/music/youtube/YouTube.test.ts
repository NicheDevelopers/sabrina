import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import Db, { type VideoMetadata } from "../../Db";
import AudioFileRepository from "../AudioFileRepository";
import { QueryKind } from "../QueryParser";
import YouTube from "./YouTube";
import * as YtDlp from "./YtDlp";

vi.mock("node:fs", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  existsSync: vi.fn(),
}));

vi.mock("./YtDlp");

vi.mock("../../logging", () => ({
  log: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("YouTube", () => {
  const videoId = "dQw4w9WgXcQ";
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const filePath = "/app/downloads/youtube/Song [dQw4w9WgXcQ].opus";
  const metadata = (id: string): VideoMetadata => ({
    id,
    title: `Song ${id}`,
    url: `https://www.youtube.com/watch?v=${id}`,
    timestamp: "3:32",
    seconds: 212,
    views: 1500,
    uploadDate: "2009-10-25",
    image: null,
    authorName: "Author",
    authorUrl: null,
  });

  const existsSync = vi.mocked(fs.existsSync);
  const downloadAudio = vi.mocked(YtDlp.downloadAudio);

  let db: Db;
  let repository: AudioFileRepository;
  let youTube: YouTube;

  beforeEach(() => {
    vi.clearAllMocks();
    db = new Db(":memory:");
    db.init();
    repository = new AudioFileRepository();
    youTube = new YouTube(repository, db);

    existsSync.mockReturnValue(true);
    downloadAudio.mockResolvedValue(filePath);
    vi.mocked(YtDlp.fetchVideo).mockResolvedValue(metadata(videoId));
  });

  afterEach(() => {
    db.close();
  });

  describe("handleQuery", () => {
    it("should fetch and save a new video from a URL", async () => {
      const { videos, errors } = await youTube.handleQuery({
        type: QueryKind.YT_URL,
        payload: videoUrl,
      });

      expect(YtDlp.fetchVideo).toHaveBeenCalledWith(videoUrl);
      expect(videos.map((video) => video.title)).toEqual([`Song ${videoId}`]);
      expect(errors).toEqual([]);
    });

    it("should not fetch a known video again", async () => {
      db.insertVideo(metadata(videoId));

      await youTube.handleQuery({ type: QueryKind.YT_URL, payload: videoUrl });

      expect(YtDlp.fetchVideo).not.toHaveBeenCalled();
    });

    it("should report a video that cannot be loaded", async () => {
      vi.mocked(YtDlp.fetchVideo).mockRejectedValue(new Error("Video unavailable"));

      const { videos, errors } = await youTube.handleQuery({
        type: QueryKind.YT_URL,
        payload: videoUrl,
      });

      expect(videos).toEqual([]);
      expect(errors).toHaveLength(1);
      expect(errors[0]?.videoId).toBe(videoId);
    });

    it("should save search results", async () => {
      vi.mocked(YtDlp.search).mockResolvedValue([metadata("search")]);

      const { videos } = await youTube.handleQuery({
        type: QueryKind.YT_SEARCH,
        payload: "song",
      });

      expect(YtDlp.search).toHaveBeenCalledWith("song");
      expect(videos.map((video) => video.id)).toEqual(["search"]);
    });

    it("should return nothing when a search finds nothing", async () => {
      vi.mocked(YtDlp.search).mockResolvedValue([]);

      const result = await youTube.handleQuery({ type: QueryKind.YT_SEARCH, payload: "x" });

      expect(result).toEqual({ videos: [], errors: [] });
    });

    it("should save every playlist video in order", async () => {
      vi.mocked(YtDlp.fetchPlaylist).mockResolvedValue([metadata("a"), metadata("b")]);

      const { videos } = await youTube.handleQuery({
        type: QueryKind.YT_PLAYLIST,
        payload: "PLexample",
      });

      expect(YtDlp.fetchPlaylist).toHaveBeenCalledWith("PLexample");
      expect(videos.map((video) => video.id)).toEqual(["a", "b"]);
      expect(YtDlp.fetchVideo).not.toHaveBeenCalled();
    });

    it("should keep a downloaded file when a known video is found again", async () => {
      db.insertVideo(metadata(videoId));
      db.setVideoPath(videoId, filePath);
      vi.mocked(YtDlp.search).mockResolvedValue([metadata(videoId)]);

      const { videos } = await youTube.handleQuery({
        type: QueryKind.YT_SEARCH,
        payload: "song",
      });

      expect(videos[0]?.path).toBe(filePath);
    });
  });

  describe("findLocalOrDownload", () => {
    it("should download a new video", async () => {
      expect(await youTube.findLocalOrDownload(videoId)).toBe(filePath);
      expect(downloadAudio).toHaveBeenCalledTimes(1);
    });

    it("should use a file found on disk without downloading", async () => {
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

    it("should keep the metadata after downloading", async () => {
      db.insertVideo(metadata(videoId));

      await youTube.findLocalOrDownload(videoId);

      const record = db.getVideoRecord(videoId);
      expect(record?.path).toBe(filePath);
      expect(record?.title).toBe(`Song ${videoId}`);
    });

    it("should fail when the download fails", async () => {
      downloadAudio.mockResolvedValue(null);

      await expect(youTube.findLocalOrDownload(videoId)).rejects.toThrow(
        "Failed to download audio",
      );
    });
  });
});
