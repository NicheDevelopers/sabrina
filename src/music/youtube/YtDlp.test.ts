import {YtDlp} from "./YtDlp";
import * as fs from "fs";

describe("YtDlp", () => {
    it("should download MP3 audio", async () => {
        const testUrl = "https://www.youtube.com/watch?v=Q470grlq0yQ";
        const outputDir = "./downloads/youtube";

        const filePath = await YtDlp.downloadAudio(testUrl, outputDir);

        if (!filePath) {
            throw new Error("Failed to download audio");
        }

        try {
            const fileStats = fs.statSync(filePath);
            if (!fileStats.isFile()) {
                throw new Error("Downloaded path is not a file");
            }
        } catch (e: unknown) {
            throw new Error(`Audio file does not exist: ${e}`);
        }
    });
});
