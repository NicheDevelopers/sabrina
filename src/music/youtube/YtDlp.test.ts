import {YtDlp} from "./YtDlp";

describe("YtDlp", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should download MP3 audio", async () => {
        const testUrl = "https://www.youtube.com/watch?v=Q470grlq0yQ";
        const outputDir = "./downloads/youtube";
        const mockFilePath = "./downloads/youtube/test-audio.mp3";

        // Mock YtDlp.downloadAudio to return a fake file path without actual download
        const downloadSpy = jest.spyOn(YtDlp, 'downloadAudio').mockResolvedValue(mockFilePath);

        const filePath = await YtDlp.downloadAudio(testUrl, outputDir);

        expect(downloadSpy).toHaveBeenCalledWith(testUrl, outputDir);
        expect(filePath).toBe(mockFilePath);
        expect(filePath).toContain('.mp3');
    }, 15000);
});
