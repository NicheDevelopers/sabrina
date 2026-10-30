import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "node:events";
import { log } from "../../logging";
import { YtDlp } from "./YtDlp";

vi.mock("child_process");

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

    it("should return the printed file path", async () => {
      expect(await runYtDlp(`${filePath}\n`)).toBe(filePath);
    });

    it("should return null when yt-dlp exits with an error", async () => {
      expect(await runYtDlp(`${filePath}\n`, 1)).toBeNull();
    });

    it("should return null when no file path was printed", async () => {
      expect(await runYtDlp("\n")).toBeNull();
    });

    it("should return null when yt-dlp cannot be started", async () => {
      const child = makeChild();
      const download = YtDlp.downloadAudio(url, outputDir);

      child.emit("error", new Error("spawn yt-dlp ENOENT"));

      expect(await download).toBeNull();
    });
  });
});
