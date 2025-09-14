// urlValidator.test.ts
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

  describe("isValidYoutubeUrl", () => {
    it("should return true for valid YouTube hosts", () => {
      const validHosts = [
        new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
        new URL("https://youtu.be/dQw4w9WgXcQ"),
        new URL("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
      ];

      for (const url of validHosts) {
        expect(UrlValidator.isValidYoutubeUrl(url)).toBe(true);
      }
    });

    it("should return false for invalid YouTube hosts", () => {
      const invalidHosts = [
        new URL("https://youtube.com/watch?v=dQw4w9WgXcQ"),
        new URL("https://m.youtube.com/watch?v=dQw4w9WgXcQ"),
        new URL("https://example.com/youtube"),
        new URL("https://www.vimeo.com/video"),
      ];

      for (const url of invalidHosts) {
        expect(UrlValidator.isValidYoutubeUrl(url)).toBe(false);
      }
    });
  });

  describe("isPlaylistUrl", () => {
    it("should identify standard YouTube playlists", () => {
      const playlistUrls = [
        new URL("https://www.youtube.com/playlist?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1"),
        new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1"),
        new URL("https://youtu.be/dQw4w9WgXcQ?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1"),
      ];

      for (const url of playlistUrls) {
        expect(UrlValidator.isPlaylistUrl(url)).toBe(true);
      }
    });

    it("should identify music.youtube.com playlists correctly", () => {
      // Valid music.youtube.com playlists
      const validMusicPlaylists = [
        new URL("https://music.youtube.com/playlist?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1"),
      ];

      for (const url of validMusicPlaylists) {
        expect(UrlValidator.isPlaylistUrl(url)).toBe(true);
      }

      // Invalid music.youtube.com playlists (not starting with /playlist)
      const invalidMusicPlaylists = [
        new URL("https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1"),
        new URL("https://music.youtube.com/channel/UC-9-kyTW8ZkZNDHQJ6FgpwQ?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1"),
      ];

      for (const url of invalidMusicPlaylists) {
        expect(UrlValidator.isPlaylistUrl(url)).toBe(false);
      }
    });

    it("should return false for URLs without list parameter", () => {
      const nonPlaylistUrls = [
        new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
        new URL("https://youtu.be/dQw4w9WgXcQ"),
        new URL("https://music.youtube.com/watch?v=dQw4w9WgXcQ"),
      ];

      for (const url of nonPlaylistUrls) {
        expect(UrlValidator.isPlaylistUrl(url)).toBe(false);
      }
    });
  });

  describe("extractVideoId", () => {
    it("should extract video ID from youtu.be URLs", () => {
      const url = new URL("https://youtu.be/dQw4w9WgXcQ");
      expect(UrlValidator.extractVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from youtube.com URLs", () => {
      const url = new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(UrlValidator.extractVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from music.youtube.com URLs", () => {
      const url = new URL("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(UrlValidator.extractVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should extract video ID from URLs with additional parameters", () => {
      const url = new URL("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1");
      expect(UrlValidator.extractVideoId(url)).toBe("dQw4w9WgXcQ");
    });

    it("should throw an error for invalid hosts", () => {
      const invalidUrls = [
        new URL("https://example.com/watch?v=dQw4w9WgXcQ"),
        new URL("https://vimeo.com/123456789"),
      ];

      for (const url of invalidUrls) {
        expect(() => UrlValidator.extractVideoId(url)).toThrow("Invalid host");
      }
    });

    it("should handle URLs without video IDs", () => {
      const urlWithoutId = new URL("https://www.youtube.com/feed/trending");

      try {
        const result = UrlValidator.extractVideoId(urlWithoutId);
        // If it returns something, it should be null or empty
        expect(result === null || result === "").toBe(true);
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error instanceof Error).toBe(true);
      }
    });
  });

  describe("validHosts", () => {
    it("should contain the expected YouTube hosts", () => {
      expect(UrlValidator.validHosts.includes("www.youtube.com")).toBe(true);
      expect(UrlValidator.validHosts.includes("youtu.be")).toBe(true);
      expect(UrlValidator.validHosts.includes("music.youtube.com")).toBe(true);
      expect(UrlValidator.validHosts.length).toBe(3);
    });
  });
});