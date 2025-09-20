import {YtDlp} from "./YtDlp.ts";

Deno.test("YtDlp Download MP3 Audio Test", async () => {
    const testUrl = "https://www.youtube.com/watch?v=Q470grlq0yQ";
    const outputDir = "./downloads/youtube";
    const filePath = await YtDlp.downloadAudio(testUrl, outputDir);
    if (!filePath) {
        throw new Error("Failed to download audio");
    }
    try {
        const fileInfo = Deno.statSync(filePath);
        if (!fileInfo.isFile) {
            throw new Error("Downloaded path is not a file");
        }
    } catch (e: unknown) {
        throw new Error(`Audio file does not exist: ${e}`);
    }
});
