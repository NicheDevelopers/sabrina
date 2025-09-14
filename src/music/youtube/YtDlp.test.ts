import { YtDlp } from "./YtDlp";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe("YtDlp", () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ytdlp-test-'));
    console.log(`Created temporary directory: ${tempDir}`);
  });

  afterEach(() => {
    // Clean up the temporary directory after the test
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log(`Removed temporary directory: ${tempDir}`);
    }
  });

  test("YtDlp Download MP3 Audio Test", async () => {
    const testUrl = "https://www.youtube.com/watch?v=qurGHhnzkfY"; // Brodka - Miales byc (Video)

    const filePath = await YtDlp.downloadAudio(testUrl, tempDir);
    if (!filePath) {
      throw new Error("Failed to download audio");
    }
    console.log(`Downloaded file path: ${filePath}`);

    const fileStats = fs.statSync(filePath);
    expect(fileStats.isFile()).toBe(true);
    expect(fileStats.size).toBeGreaterThan(0);
  }, 30000); // Increased timeout to 30 seconds for download
});