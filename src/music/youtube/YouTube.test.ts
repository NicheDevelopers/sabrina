import YouTube from "./YouTube.ts";
import { assertEquals } from "jsr:@std/assert";
import { DatabaseSync } from "node:sqlite";
import Db from "../../db.ts"; // Adjust path as needed

// Create a setup function that will be called before each test
async function setupTestDb() {
  const testDb = new DatabaseSync(':memory:');
  Db.setDatabase(testDb);
  Db.init();
  return testDb;
}

Deno.test("YouTube Search Query Test", async () => {
// Setup test database
  await setupTestDb();

  const result = await YouTube.search("Brodka - Miales Byc");
  if (!result) {
    throw new Error("No result found");
  }
  const video = result.videos[0];
  assertEquals(video.title, "Brodka - Miales byc (Video)");
  assertEquals(video.videoId, "QbxFDqadFJU");
});

Deno.test("YouTube Search ID Test", async () => {
  await setupTestDb();

  const result = await YouTube.search("QbxFDqadFJU");
  if (!result) {
    throw new Error("No result found");
  }
  const video = result.videos[0];
  assertEquals(video.title, "Brodka - Miales byc (Video)");
  assertEquals(video.videoId, "QbxFDqadFJU");
});

Deno.test("YouTube Playlist Test", async () => {
  await setupTestDb();

  const result = await YouTube.getPlaylist("PL9aeSsLln1D473mIuVZO8bIzsVnqrlNjM");
  if (!result) {
    throw new Error("No result found");
  }
  assertEquals(result.title, "Cypis");
  assertEquals(result.videos.length > 0, true);
});

Deno.test("YouTube Download Audio Test", async () => {
  await setupTestDb();

  const filePath = await YouTube.downloadAudio("QbxFDqadFJU");

// Verify the file was registered in the database
  const storedPath = Db.getVideoPath("QbxFDqadFJU");
  assertEquals(storedPath, filePath);
});