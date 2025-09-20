import {youTube} from "./YouTube";

describe("YouTube", () => {
    describe("Search Query Test", () => {
        it("should find video by search query", async () => {
            const result = await youTube.fetchSearchResults("Brodka - Miales Byc");
            if (!result) {
                throw new Error("No result found");
            }
            const video = result.videos[0];
            expect(video.title).toBe("Brodka - Miales byc (Video)");
            expect(video.videoId).toBe("QbxFDqadFJU");
        });
    });

    describe("Search ID Test", () => {
        it("should find video by video ID", async () => {
            const result = await youTube.fetchSearchResults("QbxFDqadFJU");
            if (!result) {
                throw new Error("No result found");
            }
            const video = result.videos[0];
            expect(video.title).toBe("Brodka - Miales byc (Video)");
            expect(video.videoId).toBe("QbxFDqadFJU");
        });
    });

    describe("Playlist Test", () => {
        it("should fetch playlist data", async () => {
            const result = await youTube.fetchPlaylistData(
                "PL9aeSsLln1D473mIuVZO8bIzsVnqrlNjM",
            );
            if (!result) {
                throw new Error("No result found");
            }
            expect(result.title).toBe("Cypis");
            expect(result.videos.length).toBeGreaterThan(0);
        });
    });
});
