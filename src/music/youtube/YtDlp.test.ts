import {YtDlp} from "./YtDlp.ts";

Deno.test("YtDlp Download MP3 Audio Test", async () => {
  const testUrl = "https://www.youtube.com/watch?v=qurGHhnzkfY"; // Brodka - Miales byc (Video)
  const outputDir = "./audio-files";
  const filePath = await YtDlp.downloadAudio(testUrl, outputDir);
  if (!filePath) {
    throw new Error("Failed to download audio");
  }
  console.log(`Downloaded file path: ${filePath}`);
  try {
    const fileInfo = Deno.statSync(filePath);
    if (!fileInfo.isFile) {
      throw new Error("Downloaded path is not a file");
    }
    console.log("Audio file exists and is valid.");
  } catch (e: unknown) {
    throw new Error(`Audio file does not exist: ${e}`);
  }
})