import { ChatInputCommandInteraction } from "discord.js";
import { sabrinaDb, VideoDataRecord } from "../../Db";
import NicheBot from "../../NicheBot";
import SongQueue from "../SongQueue";
import { VideoDataFetchError, youTube } from "../youtube/YouTube";
import playCommand from "./play";

jest.mock("../../NicheBot", () => ({
    __esModule: true,
    default: {
        getCurrentVoiceConnection: jest.fn(() => ({})),
        getGuildState: jest.fn(),
        joinVoiceChannel: jest.fn(),
    },
}));

jest.mock("../youtube/YouTube", () => ({
    youTube: { handleQuery: jest.fn() },
}));

jest.mock("../../Db", () => ({
    sabrinaDb: { insertPlayLog: jest.fn() },
}));

jest.mock("../../logging", () => ({
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe("/play", () => {
    let songQueue: SongQueue<VideoDataRecord>;
    let followUp: jest.Mock;

    const song = (id: string) => ({ id, title: id }) as VideoDataRecord;
    const failure = (videoId: string): VideoDataFetchError => ({
        videoId,
        error: "unavailable",
    });

    function run(videos: VideoDataRecord[], errors: VideoDataFetchError[] = []) {
        jest.mocked(youTube.handleQuery).mockResolvedValue({ videos, errors });
        return playCommand.execute({
            guildId: "guild",
            channel: null,
            interaction: {
                followUp,
                guildId: "guild",
                member: { voice: { channel: { id: "voice" } } },
                options: { getString: () => "query" },
            } as unknown as ChatInputCommandInteraction,
        });
    }

    beforeEach(() => {
        jest.clearAllMocks();
        followUp = jest.fn().mockResolvedValue(undefined);
        songQueue = new SongQueue<VideoDataRecord>();
        jest.mocked(NicheBot.getGuildState).mockReturnValue({
            songQueue,
        } as unknown as ReturnType<typeof NicheBot.getGuildState>);
    });

    it("names a single added song", async () => {
        await run([song("a")]);

        expect(followUp).toHaveBeenCalledWith("Added **a** to the queue.");
    });

    it("counts several added songs", async () => {
        await run([song("a"), song("b")]);

        expect(followUp).toHaveBeenCalledWith("Added 2 songs to the queue.");
    });

    it("mentions songs that could not be loaded", async () => {
        await run([song("a"), song("b")], [failure("x"), failure("y")]);

        expect(followUp).toHaveBeenCalledWith(
            "Added 2 songs to the queue. 2 songs could not be loaded."
        );
    });

    it("says nothing was found when the search is empty", async () => {
        await run([]);

        expect(followUp).toHaveBeenCalledWith('No results found for query: "query"');
    });

    it("says when nothing could be loaded", async () => {
        await run([], [failure("x")]);

        expect(followUp).toHaveBeenCalledWith("1 song could not be loaded.");
    });

    it("logs every added song", async () => {
        await run([song("a"), song("b")]);

        expect(sabrinaDb.insertPlayLog).toHaveBeenCalledTimes(2);
    });

    it("still succeeds when the play cannot be logged", async () => {
        jest.mocked(sabrinaDb.insertPlayLog).mockRejectedValueOnce(
            new Error("db locked")
        );

        await expect(run([song("a")])).resolves.toBeUndefined();

        expect(followUp).toHaveBeenCalledTimes(1);
        expect(songQueue.getQueue()).toHaveLength(1);
    });
});
