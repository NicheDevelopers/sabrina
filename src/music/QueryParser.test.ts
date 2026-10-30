import { describe, expect, it } from "vite-plus/test";
import * as QueryParser from "./QueryParser";
import { QueryKind } from "./QueryParser";

describe("QueryParser", () => {
  describe("parse", () => {
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
        const result = QueryParser.parse(query);
        expect(result.type).toBe(QueryKind.YT_SEARCH);
        expect(result.payload).toBe(query);
      }
    });

    it("should resolve valid YouTube URLs as YouTube URL queries", () => {
      const testUrls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "https://music.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ?t=30",
      ];

      for (const url of testUrls) {
        const result = QueryParser.parse(url);
        expect(result.type).toBe(QueryKind.YT_URL);
        expect(result.payload).toBe(url);
      }
    });

    it("should resolve valid YouTube playlist URLs as YouTube playlist queries", () => {
      const testPlaylistUrls = [
        {
          input: "https://www.youtube.com/playlist?list=PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
          expectedPayload: "PLH-huzMEgGWBUU5E6hzHpBXN5T13IbgB1",
        },
        {
          input: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLexample",
          expectedPayload: "PLexample",
        },
      ];
      for (const testCase of testPlaylistUrls) {
        const result = QueryParser.parse(testCase.input);
        expect(result.type).toBe(QueryKind.YT_PLAYLIST);
        expect(result.payload).toBe(testCase.expectedPayload);
      }
    });

    it("should ignore autoplay lists on YouTube Music", () => {
      const url = "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDexample";

      expect(QueryParser.parse(url).type).toBe(QueryKind.YT_URL);
    });

    it("should handle edge cases gracefully", () => {
      const edgeCases = [
        {
          input: "https://example.com",
          expectedType: QueryKind.YT_SEARCH,
          expectedPayload: "https://example.com",
        },
        {
          input: "http://not-youtube.com/watch?v=something",
          expectedType: QueryKind.YT_SEARCH,
          expectedPayload: "http://not-youtube.com/watch?v=something",
        },
        {
          input: "youtube.com/watch?v=invalid",
          expectedType: QueryKind.YT_SEARCH,
          expectedPayload: "youtube.com/watch?v=invalid",
        },
      ];

      for (const testCase of edgeCases) {
        const result = QueryParser.parse(testCase.input);
        expect(result.type).toBe(testCase.expectedType);
        expect(result.payload).toBe(testCase.expectedPayload);
      }
    });
  });
});
