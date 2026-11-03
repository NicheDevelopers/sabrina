import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "node:events";
import { setPriority } from "node:os";
import { log } from "../../logging";
import * as YtDlp from "./YtDlp";

vi.mock("child_process");

vi.mock("node:os", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  setPriority: vi.fn(),
}));

vi.mock("../../logging", () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const outputDir = "./downloads/youtube";
const filePath = "/app/downloads/youtube/Song - Author [dQw4w9WgXcQ].opus";

function makeChild() {
  const child = Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
  });
  vi.mocked(spawn).mockReturnValue(child as unknown as ChildProcess);
  return child;
}

function runYtDlp(stdout: string, exitCode = 0) {
  const child = makeChild();
  const download = YtDlp.downloadAudio(url, outputDir);

  child.stdout.emit("data", Buffer.from(stdout));
  child.emit("close", exitCode);

  return download;
}

describe("YtDlp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("update", () => {
    function runUpdate(exitCode: number, output: string) {
      const child = makeChild();
      const update = YtDlp.update();

      child.stdout.emit("data", Buffer.from(output));
      child.emit("close", exitCode);

      return update;
    }

    it("should update to the same channel the image installs", async () => {
      await runUpdate(0, "yt-dlp is up to date");

      const [command, args] = vi.mocked(spawn).mock.calls[0];
      expect(command).toBe("yt-dlp");
      expect(args).toEqual(["--update-to", "master"]);
    });

    it("should report success", async () => {
      expect(await runUpdate(0, "Updated yt-dlp")).toBe(true);
    });

    it("should warn instead of failing when the update fails", async () => {
      expect(await runUpdate(1, "Unable to reach GitHub")).toBe(false);
      expect(log.warn).toHaveBeenCalledWith(expect.stringContaining("Unable to reach GitHub"));
    });

    it("should warn instead of failing when yt-dlp cannot be started", async () => {
      const child = makeChild();
      const update = YtDlp.update();

      child.emit("error", new Error("spawn yt-dlp ENOENT"));

      expect(await update).toBe(false);
      expect(log.warn).toHaveBeenCalled();
    });
  });

  describe("startAutoUpdate", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("should update immediately and then once a day", () => {
      vi.useFakeTimers();
      makeChild();

      YtDlp.startAutoUpdate();
      expect(spawn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      expect(spawn).toHaveBeenCalledTimes(2);
    });
  });

  describe("metadata", () => {
    function respondWith(stdout: string, exitCode = 0, stderr = "") {
      const child = makeChild();
      setImmediate(() => {
        child.stdout.emit("data", Buffer.from(stdout));
        child.stderr.emit("data", Buffer.from(stderr));
        child.emit("close", exitCode);
      });
    }

    const fullVideo = {
      id: "jNQXAC9IVRw",
      title: "Me at the zoo",
      webpage_url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      duration: 19,
      duration_string: "19",
      view_count: 447172098,
      upload_date: "20050424",
      thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
      uploader: "jawed",
      uploader_url: "https://www.youtube.com/@jawed",
      channel_url: "https://www.youtube.com/channel/UC4QobU6STFB0",
    };

    const flatVideo = {
      id: "ftaXMKV3ffE",
      title: "Song",
      url: "https://www.youtube.com/watch?v=ftaXMKV3ffE",
      duration: 161,
      duration_string: "2:41",
      view_count: 51000000,
      thumbnails: [
        { url: "https://i.ytimg.com/small.jpg" },
        { url: "https://i.ytimg.com/large.jpg" },
      ],
      channel: "Playboi Carti",
      channel_url: "https://www.youtube.com/channel/UC652oRUvX1on",
    };

    it("should read a full video", async () => {
      respondWith(`${JSON.stringify(fullVideo)}\n`);

      expect(await YtDlp.fetchVideo(url)).toEqual({
        id: "jNQXAC9IVRw",
        title: "Me at the zoo",
        url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
        timestamp: "19",
        seconds: 19,
        views: 447172098,
        uploadDate: "2005-04-24",
        image: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
        authorName: "jawed",
        authorUrl: "https://www.youtube.com/@jawed",
      });
      expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual([
        "--js-runtimes",
        "node",
        "--dump-json",
        "--no-playlist",
        url,
      ]);
    });

    it("should fail when a video cannot be loaded", async () => {
      respondWith("", 1, "ERROR: Video unavailable");

      await expect(YtDlp.fetchVideo(url)).rejects.toThrow("Video unavailable");
    });

    it("should fail when yt-dlp cannot be started", async () => {
      const child = makeChild();
      const fetched = YtDlp.fetchVideo(url);

      child.emit("error", new Error("spawn yt-dlp ENOENT"));

      await expect(fetched).rejects.toThrow("ENOENT");
    });

    it("should fail on unreadable output", async () => {
      respondWith("not json\n");

      await expect(YtDlp.fetchVideo(url)).rejects.toThrow();
    });

    it("should search for a single result", async () => {
      respondWith(`${JSON.stringify(fullVideo)}\n`);

      const results = await YtDlp.search("--me at the zoo");

      expect(results.map((video) => video.id)).toEqual(["jNQXAC9IVRw"]);
      expect(vi.mocked(spawn).mock.calls[0]?.[1]).toContain("ytsearch1:--me at the zoo");
    });

    it("should find nothing when the search is empty", async () => {
      respondWith("");

      expect(await YtDlp.search("nothing")).toEqual([]);
    });

    it("should read a playlist in a single flat request", async () => {
      respondWith(`${JSON.stringify(flatVideo)}\n${JSON.stringify(fullVideo)}\n`);

      const videos = await YtDlp.fetchPlaylist("PLexample");

      expect(spawn).toHaveBeenCalledTimes(1);
      expect(vi.mocked(spawn).mock.calls[0]?.[1]).toContain("--flat-playlist");
      expect(videos.map((video) => video.id)).toEqual(["ftaXMKV3ffE", "jNQXAC9IVRw"]);
      expect(videos[0]).toMatchObject({
        url: "https://www.youtube.com/watch?v=ftaXMKV3ffE",
        image: "https://i.ytimg.com/large.jpg",
        authorName: "Playboi Carti",
        uploadDate: null,
      });
    });
  });

  describe("downloadAudio", () => {
    it("should extract audio from the given URL into the output directory", async () => {
      await runYtDlp(`${filePath}\n`);

      const [command, args] = vi.mocked(spawn).mock.calls[0];
      expect(command).toBe("yt-dlp");
      expect(args).toContain("-x");
      expect(args).toContain(url);
      expect(args[args.indexOf("-o") + 1]).toMatch(/^\.\/downloads\/youtube\//);
    });

    it("should ask yt-dlp for the final file path", async () => {
      await runYtDlp(`${filePath}\n`);

      const args = vi.mocked(spawn).mock.calls[0][1];
      expect(args[args.indexOf("--print") + 1]).toBe("after_move:filepath");
    });

    it("should run YouTube's JavaScript with Node", async () => {
      await runYtDlp(`${filePath}\n`);

      const args = vi.mocked(spawn).mock.calls[0]?.[1] ?? [];
      expect(args[args.indexOf("--js-runtimes") + 1]).toBe("node");
    });

    it("should return the printed file path", async () => {
      expect(await runYtDlp(`${filePath}\n`)).toBe(filePath);
    });

    it("should return null when yt-dlp exits with an error", async () => {
      expect(await runYtDlp(`${filePath}\n`, 1)).toBeNull();
    });

    it("should return null when no file path was printed", async () => {
      expect(await runYtDlp("\n")).toBeNull();
    });

    it("should neither throttle nor deprioritize a normal download", async () => {
      await runYtDlp(`${filePath}\n`);

      expect(vi.mocked(spawn).mock.calls[0][1]).not.toContain("--limit-rate");
      expect(setPriority).not.toHaveBeenCalled();
    });

    describe("in the background", () => {
      function runBackground() {
        const child = Object.assign(makeChild(), { pid: 1234 });
        const download = YtDlp.downloadAudio(url, outputDir, { background: true });

        child.stdout.emit("data", Buffer.from(`${filePath}\n`));
        child.emit("close", 0);

        return download;
      }

      it("should limit the download rate", async () => {
        await runBackground();

        const args = vi.mocked(spawn).mock.calls[0][1];
        expect(args[args.indexOf("--limit-rate") + 1]).toBe("2M");
      });

      it("should run at low priority", async () => {
        await runBackground();

        expect(setPriority).toHaveBeenCalledWith(1234, expect.any(Number));
      });

      it("should still download when the priority cannot be changed", async () => {
        vi.mocked(setPriority).mockImplementationOnce(() => {
          throw new Error("EPERM");
        });

        expect(await runBackground()).toBe(filePath);
        expect(log.warn).toHaveBeenCalled();
      });
    });

    it("should return null when yt-dlp cannot be started", async () => {
      const child = makeChild();
      const download = YtDlp.downloadAudio(url, outputDir);

      child.emit("error", new Error("spawn yt-dlp ENOENT"));

      expect(await download).toBeNull();
    });
  });
});
