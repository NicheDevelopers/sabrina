import YouTube from "./YouTube";
import betterSqlite3 from "better-sqlite3";
import Db from "../../db"; // Adjust path as needed

// Create a setup function that will be called before each test
async function setupTestDb() {
  const testDb = new betterSqlite3(':memory:');
  Db.setDatabase(testDb);
  Db.init();
  return testDb;
}

describe("YouTube", () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  test("YouTube Search Query Test", async () => {
    const result = await YouTube.search("Brodka - Miales Byc");
    if (!result) {
      throw new Error("No result found");
    }
    const video = result.videos[0];
    expect(video.title).toBe("Brodka - Miales byc (Video)");
    expect(video.videoId).toBe("QbxFDqadFJU");
  });

  test("YouTube Search ID Test", async () => {
    const result = await YouTube.search("QbxFDqadFJU");
    if (!result) {
      throw new Error("No result found");
    }
    const video = result.videos[0];
    expect(video.title).toBe("Brodka - Miales byc (Video)");
    expect(video.videoId).toBe("QbxFDqadFJU");
  });

  test("YouTube Playlist Test", async () => {
    const result = await YouTube.getPlaylist("PL9aeSsLln1D473mIuVZO8bIzsVnqrlNjM");
    if (!result) {
      throw new Error("No result found");
    }
    expect(result.title).toBe("Cypis");
    expect(result.videos.length > 0).toBe(true);
  });

  test("YouTube Download Audio Test", async () => {
    const filePath = await YouTube.downloadAudio("QbxFDqadFJU");

    // Verify the file was registered in the database
    const storedPath = Db.getVideoPath("QbxFDqadFJU");
    expect(storedPath).toBe(filePath);
  });
});