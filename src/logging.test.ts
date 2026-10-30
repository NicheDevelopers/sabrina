import { Writable } from "node:stream";
import winston from "winston";
import { consoleFormat, log } from "./logging";

describe("logging", () => {
    let lines: string[];
    let transport: winston.transport;

    beforeEach(() => {
        lines = [];
        transport = new winston.transports.Stream({
            format: winston.format.printf(info => String(info.message)),
            stream: new Writable({
                write(chunk, _encoding, done) {
                    lines.push(chunk.toString());
                    done();
                },
            }),
        });
        log.add(transport);
    });

    afterEach(() => {
        log.remove(transport);
        jest.useRealTimers();
    });

    it("includes the stack trace of an error", () => {
        const error = new Error("boom");

        log.error("Download failed:", error);

        expect(lines[0]).toContain("Download failed: boom");
        expect(lines[0]).toContain(error.stack);
    });

    it("includes the stack trace when the message contains a percent sign", () => {
        const error = new Error("boom");

        log.error("Failed at 100%s:", error);

        expect(lines[0]).toContain(error.stack);
    });

    it("includes string details", () => {
        log.error("Download failed:", "video unavailable");

        expect(lines[0]).toContain("Download failed: video unavailable");
    });

    it("includes object details", () => {
        log.error("Download failed:", { code: 42 });

        expect(lines[0]).toContain("code: 42");
    });

    it("leaves plain messages alone", () => {
        log.error("Download failed");

        expect(lines[0].trim()).toBe("Download failed");
    });

    it("prints timestamps on a 24-hour clock", () => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 9, 30, 15, 4, 5));

        const info = consoleFormat.transform({
            [Symbol.for("level")]: "info",
            level: "info",
            message: "hello",
        });

        expect((info as Record<symbol, string>)[Symbol.for("message")]).toContain(
            "2026-10-30 15:04:05"
        );
    });
});
