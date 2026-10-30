import { VideoDataRecord } from "../Db";
import EmbedCreator from "./EmbedCreator";

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
        ago: "16 years ago",
        image: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        authorName: "Author",
        authorUrl: "https://www.youtube.com/@author",
    };

    describe("createNowPlayingEmbed", () => {
        it("shows the song details", () => {
            const { title, author, fields } =
                EmbedCreator.createNowPlayingEmbed(video).toJSON();

            expect(title).toBe("Song");
            expect(author).toEqual({ name: "Author", url: video.authorUrl });
            expect(fields?.map(field => field.value)).toEqual([
                "3:32",
                "1.5K",
                "16 years ago",
            ]);
        });

        it("handles a video without metadata", () => {
            const embed = EmbedCreator.createNowPlayingEmbed({
                ...video,
                title: null,
                url: null,
                timestamp: null,
                views: null,
                ago: null,
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
                ago: "",
            }).toJSON();

            expect(fields?.map(field => field.value)).toEqual([
                "Unknown",
                "1.5K",
                "Unknown",
            ]);
        });
    });
});
