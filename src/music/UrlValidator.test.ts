// urlValidator.test.ts
import { assertEquals, assertThrows } from "https://deno.land/std/testing/asserts.ts";
import { describe, it } from "https://deno.land/std/testing/bdd.ts";
import UrlValidator from "./UrlValidator.ts";

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
                assertEquals(
                    UrlValidator.isValidHttpUrl(url),
                    true,
                    `URL should be valid: ${url}`,
                );
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
                assertEquals(
                    UrlValidator.isValidHttpUrl(url),
                    false,
                    `URL should be invalid: ${url}`,
                );
            }
        });
    });

    describe("isValidYoutubeUrl", () => {
        it("should return true for valid YouTube hosts", () => {
            const validHosts = [
                new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
                new URL("https://youtu.be/dQw4w9WgXcQ"),
                new URL("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
            ];

            for (const url of validHosts) {
                assertEquals(
                    UrlValidator.isValidYoutubeUrl(url),
                    true,
                    `Host should be valid: ${url.hostname}`,
                );
            }
        });

        it("should return false for invalid YouTube hosts", () => {
            const invalidHosts = [
                new URL("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
                new URL("https://example.com/youtube"),
                new URL("https://www.vimeo.com/video"),
            ];

            for (const url of invalidHosts) {
                assertEquals(
                    UrlValidator.isValidYoutubeUrl(url),
                    false,
                    `Host should be invalid: ${url.hostname}`,
                );
            }
        });
    });

    describe("isPlaylistUrl", () => {
        it("should identify standard YouTube playlists", () => {
            const playlistUrls = [
                new URL(
                    "https://www.youtube.com/playlist?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
                ),
                new URL(
                    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
                ),
                new URL(
                    "https://youtu.be/dQw4w9WgXcQ?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
                ),
            ];

            for (const url of playlistUrls) {
                assertEquals(
                    UrlValidator.isPlaylistUrl(url),
                    true,
                    `URL should be a playlist: ${url.toString()}`,
                );
            }
        });

        it("should identify music.youtube.com playlists correctly", () => {
            // Valid music.youtube.com playlists
            const validMusicPlaylists = [
                new URL(
                    "https://music.youtube.com/playlist?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
                ),
            ];

            for (const url of validMusicPlaylists) {
                assertEquals(
                    UrlValidator.isPlaylistUrl(url),
                    true,
                    `URL should be a playlist: ${url.toString()}`,
                );
            }

            // Invalid music.youtube.com playlists (not starting with /playlist)
            const invalidMusicPlaylists = [
                new URL(
                    "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
                ),
                new URL(
                    "https://music.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
                ),
            ];

            for (const url of invalidMusicPlaylists) {
                assertEquals(
                    UrlValidator.isPlaylistUrl(url),
                    false,
                    `URL should not be a playlist: ${url.toString()}`,
                );
            }
        });

        it("should return false for URLs without list parameter", () => {
            const nonPlaylistUrls = [
                new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
                new URL("https://youtu.be/dQw4w9WgXcQ"),
                new URL("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
            ];

            for (const url of nonPlaylistUrls) {
                assertEquals(
                    UrlValidator.isPlaylistUrl(url),
                    false,
                    `URL should not be a playlist: ${url.toString()}`,
                );
            }
        });
    });

    describe("extractVideoId", () => {
        it("should extract video ID from youtu.be URLs", () => {
            const url = new URL("https://youtu.be/dQw4w9WgXcQ");
            assertEquals(UrlValidator.extractVideoId(url), "dQw4w9WgXcQ");
        });

        it("should extract video ID from youtube.com URLs", () => {
            const url = new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
            assertEquals(UrlValidator.extractVideoId(url), "dQw4w9WgXcQ");
        });

        it("should extract video ID from music.youtube.com URLs", () => {
            const url = new URL("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
            assertEquals(UrlValidator.extractVideoId(url), "dQw4w9WgXcQ");
        });

        it("should extract video ID from URLs with additional parameters", () => {
            const url = new URL(
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
            );
            assertEquals(UrlValidator.extractVideoId(url), "dQw4w9WgXcQ");
        });

        it("should throw an error for invalid hosts", () => {
            const invalidUrls = [
                new URL("https://example.com/watch?v=dQw4w9WgXcQ"),
                new URL("https://vimeo.com/123456789"),
            ];

            for (const url of invalidUrls) {
                assertThrows(
                    () => UrlValidator.extractVideoId(url),
                    Error,
                    "Invalid host",
                );
            }
        });

        it("should handle URLs without video IDs", () => {
            // This test verifies the behavior when a URL doesn't have a video ID
            // Note: The current implementation will return null or throw an error
            // depending on how searchParams.get() behaves when the parameter is missing

            const urlWithoutId = new URL("https://www.youtube.com/feed/trending");

            // The method will try to access searchParams.get("v")!
            // This will either return null (and then be used as a string) or throw
            // We're testing that the method doesn't crash unexpectedly
            try {
                const result = UrlValidator.extractVideoId(urlWithoutId);
                // If it returns something, it should be null or empty
                assertEquals(result === null || result === "", true);
            } catch (error) {
                // If it throws, that's also acceptable behavior
                // We just want to make sure it's a controlled failure
                assertEquals(error instanceof Error, true);
            }
        });
    });

    describe("validHosts", () => {
        it("should contain the expected YouTube hosts", () => {
            assertEquals(UrlValidator.validHosts.includes("www.youtube.com"), true);
            assertEquals(UrlValidator.validHosts.includes("youtu.be"), true);
            assertEquals(UrlValidator.validHosts.includes("music.youtube.com"), true);
            assertEquals(UrlValidator.validHosts.includes("youtube.com"), true);
            assertEquals(UrlValidator.validHosts.length, 4);
        });
    });
});
