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
const filePath = "./downloads/youtube/Song - Author [dQw4w9WgXcQ]";

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
            await runYtDlp(`[ExtractAudio] Destination: ${filePath}.opus\n`);

            const [command, args] = jest.mocked(spawn).mock.calls[0];
            expect(command).toBe("yt-dlp");
            expect(args).toContain("-x");
            expect(args).toContain(url);
            expect(args[args.indexOf("-o") + 1]).toMatch(/^\.\/downloads\/youtube\//);
        });

        it("should return the path of the extracted audio file", async () => {
            const stdout = [
                `[youtube] dQw4w9WgXcQ: Downloading webpage`,
                `[download] Destination: ${filePath}.webm`,
                `[download] 100% of 3.28MiB`,
                `[ExtractAudio] Destination: ${filePath}.opus`,
                `Deleting original file ${filePath}.webm (pass -k to keep)`,
                "",
            ].join("\n");

            expect(await runYtDlp(stdout)).toBe(`${filePath}.opus`);
        });

        it("should return the path of an already downloaded file", async () => {
            const stdout = `[download] ${filePath}.opus has already been downloaded\n`;

            expect(await runYtDlp(stdout)).toBe(`${filePath}.opus`);
        });

        it("should return null when yt-dlp exits with an error", async () => {
            const stdout = `[ExtractAudio] Destination: ${filePath}.opus\n`;

            expect(await runYtDlp(stdout, 1)).toBeNull();
        });

        it("should return null when the output has no file path", async () => {
            expect(
                await runYtDlp("[youtube] dQw4w9WgXcQ: Downloading webpage\n")
            ).toBeNull();
        });

        it("should return null when yt-dlp cannot be started", async () => {
            const child = makeChild();
            const download = YtDlp.downloadAudio(url, outputDir);

            child.emit("error", new Error("spawn yt-dlp ENOENT"));

            expect(await download).toBeNull();
        });
    });

    // Each test states the correct behaviour and fails against the current code.
    // Jest reports it as an error once the bug is fixed: remove `.failing` then.
    // The fixture is yt-dlp's current output, so update it if the parsing changes.
    describe("known bugs", () => {
        it.failing(
            "should return the path of a file that needs no conversion",
            async () => {
                const stdout = [
                    `[download] Destination: ${filePath}.m4a`,
                    `[ExtractAudio] Not converting audio ${filePath}.m4a; the file is already in a common audio format`,
                    "",
                ].join("\n");

                expect(await runYtDlp(stdout)).toBe(`${filePath}.m4a`);
            }
        );
    });
});
