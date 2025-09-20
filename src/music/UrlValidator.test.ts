import UrlValidator from "./UrlValidator";

describe("UrlValidator", () => {
    describe("isValidHttpUrl", () => {
        it("should return true for valid HTTP URLs", () => {
            const validUrls = [
                "http://example.com",
                "https://example.com",
                "http:/example.com",
                "http://example.com/path",
                "https://example.com/path?query=value",
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "https://youtu.be/dQw4w9WgXcQ",
            ];

            for (const url of validUrls) {
                expect(UrlValidator.isValidHttpUrl(url)).toBe(true);
            }
        });

        it("should return false for invalid HTTP URLs", () => {
            const invalidUrls = [
                "example.com",
                "ftp://example.com",
                "//example.com",
                "just some text",
                "",
                " ",
                "mailto:user@example.com",
            ];

            for (const url of invalidUrls) {
                expect(UrlValidator.isValidHttpUrl(url)).toBe(false);
            }
        });
    });

    describe("extractVideoId", () => {
        it("should extract video ID from various YouTube URL formats", () => {
            const testCases = [
                {
                    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                    expected: "dQw4w9WgXcQ",
                },
                {
                    url: "https://youtu.be/dQw4w9WgXcQ",
                    expected: "dQw4w9WgXcQ",
                },
                {
                    url: "https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
                    expected: "dQw4w9WgXcQ",
                },
                {
                    url: "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
                    expected: "dQw4w9WgXcQ",
                },
            ];

            for (const testCase of testCases) {
                const url = new URL(testCase.url);
                expect(UrlValidator.extractVideoId(url)).toBe(testCase.expected);
            }
        });

        it("should throw error for invalid YouTube URLs", () => {
            const invalidUrls = [
                "https://example.com",
                "https://vimeo.com/12345",
            ];

            for (const urlString of invalidUrls) {
                const url = new URL(urlString);
                expect(() => {
                    UrlValidator.extractVideoId(url);
                }).toThrow("Invalid host");
            }
        });
    });

    describe("isValidYoutubeUrl", () => {
        it("should return true for valid YouTube URLs", () => {
            const validUrls = [
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "https://youtu.be/dQw4w9WgXcQ",
                "https://youtube.com/watch?v=dQw4w9WgXcQ",
                "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
            ];

            for (const urlString of validUrls) {
                const url = new URL(urlString);
                expect(UrlValidator.isValidYoutubeUrl(url)).toBe(true);
            }
        });

        it("should return false for non-YouTube URLs", () => {
            const invalidUrls = [
                "https://example.com",
                "https://vimeo.com/12345",
                "https://dailymotion.com/video/x123",
            ];

            for (const urlString of invalidUrls) {
                const url = new URL(urlString);
                expect(UrlValidator.isValidYoutubeUrl(url)).toBe(false);
            }
        });
    });

    describe("isPlaylistUrl", () => {
        it("should return true for playlist URLs", () => {
            const playlistUrls = [
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLexample",
                "https://youtube.com/playlist?list=PLexample",
            ];

            for (const urlString of playlistUrls) {
                const url = new URL(urlString);
                expect(UrlValidator.isPlaylistUrl(url)).toBe(true);
            }
        });

        it("should return false for non-playlist URLs", () => {
            const nonPlaylistUrls = [
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "https://youtu.be/dQw4w9WgXcQ",
            ];

            for (const urlString of nonPlaylistUrls) {
                const url = new URL(urlString);
                expect(UrlValidator.isPlaylistUrl(url)).toBe(false);
            }
        });
    });

    describe("validation edge cases", () => {
        it("should handle malformed URLs gracefully in isValidHttpUrl", () => {
            const malformedUrls = [
                "https://",
                "://youtube.com",
                "youtube",
                "www.youtube.com",
            ];

            for (const url of malformedUrls) {
                expect(() => {
                    UrlValidator.isValidHttpUrl(url);
                }).not.toThrow();
                expect(UrlValidator.isValidHttpUrl(url)).toBe(false);
            }
        });
    });
});
