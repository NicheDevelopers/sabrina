import { describe, expect, it, vi } from "vite-plus/test";
import { VideoDataRecord } from "../Db";
import EmbedCreator from "./EmbedCreator";

vi.mock("../Config", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  VERSION: "1.2.3",
}));

vi.mock("./youtube/YtDlp", () => ({
  YtDlp: { getVersion: () => "2026.10.29" },
}));

describe("EmbedCreator", () => {
  const video: VideoDataRecord = {
    id: "dQw4w9WgXcQ",
    path: null,
    title: "Song",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    timestamp: "3:32",
    seconds: 212,
    views: 1500,
    uploadDate: "2009-10-25",
    image: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    authorName: "Author",
    authorUrl: "https://www.youtube.com/@author",
  };

  describe("createAboutEmbed", () => {
    it("shows the release version", () => {
      const { description } = EmbedCreator.createAboutEmbed(0).toJSON();

      expect(description).toContain("**Version:** 1.2.3");
    });
  });

  describe("createNowPlayingEmbed", () => {
    it("shows the song details", () => {
      const { title, author, fields } = EmbedCreator.createNowPlayingEmbed(video).toJSON();

      expect(title).toBe("Song");
      expect(author).toEqual({ name: "Author", url: video.authorUrl });
      expect(fields?.map((field) => field.value)).toEqual(["3:32", "1.5K", "2009-10-25"]);
    });

    it("handles a video without metadata", () => {
      const embed = EmbedCreator.createNowPlayingEmbed({
        ...video,
        title: null,
        url: null,
        timestamp: null,
        views: null,
        uploadDate: null,
        image: null,
        authorName: null,
        authorUrl: null,
      }).toJSON();

      expect(embed.author?.name).toBe("Unknown");
      expect(embed.author?.url).toBeUndefined();
    });

    it("handles empty metadata", () => {
      const { fields } = EmbedCreator.createNowPlayingEmbed({
        ...video,
        timestamp: "",
        uploadDate: "",
      }).toJSON();

      expect(fields?.map((field) => field.value)).toEqual(["Unknown", "1.5K", "Unknown"]);
    });
  });
});
