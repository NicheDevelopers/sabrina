import { youTube } from "./YouTube.ts";
import { assertEquals } from "jsr:@std/assert";

Deno.test("YouTube Search Query Test", async () => {
  const result = await youTube.search("Brodka - Miales Byc");
  if (!result) {
    throw new Error("No result found");
  }
  const video = result.videos[0];
  assertEquals(video.title, "Brodka - Miales byc (Video)");
  assertEquals(video.videoId, "QbxFDqadFJU");
});

Deno.test("YouTube Search ID Test", async () => {
  const result = await youTube.search("QbxFDqadFJU");
  if (!result) {
    throw new Error("No result found");
  }
  const video = result.videos[0];
  assertEquals(video.title, "Brodka - Miales byc (Video)");
  assertEquals(video.videoId, "QbxFDqadFJU");
});

Deno.test("YouTube Playlist Test", async () => {
  const result = await youTube.getPlaylist(
    "PL9aeSsLln1D473mIuVZO8bIzsVnqrlNjM",
  );
  if (!result) {
    throw new Error("No result found");
  }
  assertEquals(result.title, "Cypis");
  assertEquals(result.videos.length > 0, true);
});
