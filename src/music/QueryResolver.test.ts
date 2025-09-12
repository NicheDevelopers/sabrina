import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { describe, it } from "https://deno.land/std/testing/bdd.ts";
import QueryResolver, { QueryType } from "./QueryResolver.ts";

describe("QueryResolver", () => {
  describe("resolve", () => {
    it("should resolve plain text as YouTube search query", () => {
      const testQueries = [
        "diss na nowaka",
        "firmas",
        "billie eilish bad guy",
        "some random search query",
        "123456789",
        "",
        " ",
      ];

      for (const query of testQueries) {
        const result = QueryResolver.resolve(query);
        assertEquals(result.type, QueryType.YT_SEARCH);
        assertEquals(result.payload, query);
      }
    });

    it("should resolve valid YouTube URLs as YouTube URL queries", () => {
      const testUrls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/playlist?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
        "https://youtu.be/dQw4w9WgXcQ?t=30",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
      ];

      for (const url of testUrls) {
        const result = QueryResolver.resolve(url);
        assertEquals(result.type, QueryType.YT_URL);
        assertEquals(result.payload, url);
      }
    });

    it("should resolve non-YouTube URLs as YouTube search queries", () => {
      const testUrls = [
        "https://example.com",
        "https://vimeo.com/123456789",
        "https://soundcloud.com/artist/track",
        "https://spotify.com/track/123456",
        "http://youtube.org/fake", // Not a real YouTube domain
      ];

      for (const url of testUrls) {
        const result = QueryResolver.resolve(url);
        assertEquals(result.type, QueryType.YT_SEARCH);
        assertEquals(result.payload, url);
      }
    });

    it("should handle malformed URLs as YouTube search queries", () => {
      const testQueries = [
        "www.youtube.com/watch?v=dQw4w9WgXcQ", // Missing protocol
        "youtube.com/watch?v=dQw4w9WgXcQ",      // Missing protocol and not in validHosts
        "http:youtube.com/watch?v=dQw4w9WgXcQ", // Malformed URL
      ];

      for (const query of testQueries) {
        const result = QueryResolver.resolve(query);
        assertEquals(result.type, QueryType.YT_SEARCH);
        assertEquals(result.payload, query);
      }
    });

    it("should handle edge cases correctly", () => {
      // Test with a URL that's valid HTTP but not YouTube
      const nonYoutubeUrl = "https://example.com/youtube?v=123";
      const result1 = QueryResolver.resolve(nonYoutubeUrl);
      assertEquals(result1.type, QueryType.YT_SEARCH);
      assertEquals(result1.payload, nonYoutubeUrl);

      // Test with a URL that looks like YouTube but isn't in validHosts
      const fakeYoutubeUrl = "https://youtube.com/watch?v=dQw4w9WgXcQ"; // Missing "www."
      const result2 = QueryResolver.resolve(fakeYoutubeUrl);
      assertEquals(result2.type, QueryType.YT_SEARCH);
      assertEquals(result2.payload, fakeYoutubeUrl);
    });

    it("should handle type checking correctly", () => {
      // Test for YouTubeSearchQuery type
      const searchQuery = QueryResolver.resolve("search query");
      if (searchQuery.type === QueryType.YT_SEARCH) {
        // This should be accessible
        assertEquals(typeof searchQuery.payload, "string");
      } else {
        // This should never happen
        assertEquals(true, false, "Search query was incorrectly typed");
      }

      // Test for YouTubeUrlQuery type
      const urlQuery = QueryResolver.resolve("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      if (urlQuery.type === QueryType.YT_URL) {
        // This should be accessible
        assertEquals(typeof urlQuery.payload, "string");
      } else {
        // This should never happen
        assertEquals(true, false, "URL query was incorrectly typed");
      }
    });
  });
});