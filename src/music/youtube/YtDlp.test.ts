import { ChildProcess, spawn } from "child_process";
import { EventEmitter } from "node:events";
import { YtDlp } from "./YtDlp";

jest.mock("child_process");

jest.mock("../../logging", () => ({
    log: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
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
    jest.mocked(spawn).mockReturnValue(child as unknown as ChildProcess);
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
        jest.clearAllMocks();
    });

    describe("downloadAudio", () => {
        it("should extract audio from the given URL into the output directory", async () => {
            await runYtDlp(`${filePath}\n`);

            const [command, args] = jest.mocked(spawn).mock.calls[0];
            expect(command).toBe("yt-dlp");
            expect(args).toContain("-x");
            expect(args).toContain(url);
            expect(args[args.indexOf("-o") + 1]).toMatch(/^\.\/downloads\/youtube\//);
        });

        it("should ask yt-dlp for the final file path", async () => {
            await runYtDlp(`${filePath}\n`);

            const args = jest.mocked(spawn).mock.calls[0][1];
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
