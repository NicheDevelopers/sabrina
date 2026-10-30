import { beforeEach, describe, expect, it, vi, type Mock } from "vite-plus/test";
import { ChatInputCommandInteraction } from "discord.js";
import { VideoDataRecord } from "../../Db";
import NicheBot from "../../NicheBot";
import SongQueue, { LoopType } from "../SongQueue";
import { sabrinaDb } from "../../Db";
import { VideoDataFetchError, youTube } from "../youtube/YouTube";
import playNowCommand from "./playNow";

vi.mock("../../NicheBot", () => ({
  default: {
    getGuildPlayer: vi.fn(),
  },
}));

vi.mock("../youtube/YouTube", () => ({
  youTube: { handleQuery: vi.fn() },
}));

vi.mock("../../Db", () => ({
  sabrinaDb: { insertPlayLog: vi.fn() },
}));

vi.mock("../../logging", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe("/playnow", () => {
  let songQueue: SongQueue<VideoDataRecord>;
  let played: string[];
  let followUp: Mock;

  const song = (id: string) => ({ id, title: id }) as VideoDataRecord;
  const queuedIds = () => songQueue.getQueue().map((video) => video.id);

  function run(
    videos: VideoDataRecord[],
    skip: boolean | null = null,
    errors: VideoDataFetchError[] = [],
  ) {
    vi.mocked(youTube.handleQuery).mockResolvedValue({ videos, errors });
    return playNowCommand.execute({
      guildId: "guild",
      channel: null,
      interaction: {
        followUp,
        options: {
          getString: () => "query",
          getBoolean: () => skip,
        },
      } as unknown as ChatInputCommandInteraction,
    });
  }

  beforeEach(() => {
    played = [];
    followUp = vi.fn().mockResolvedValue(undefined);
    songQueue = new SongQueue<VideoDataRecord>(async (video) => {
      played.push(video.id);
    });
    vi.mocked(NicheBot.getGuildPlayer).mockReturnValue({
      isConnected: () => true,
      songQueue,
    } as unknown as ReturnType<typeof NicheBot.getGuildPlayer>);
  });

  it("plays the song after the current one", async () => {
    songQueue.addSongs([song("a"), song("b")]);

    await run([song("new")]);

    expect(queuedIds()).toEqual(["a", "new", "b"]);
    expect(played).toEqual(["a"]);
  });

  it("skips straight to the new song", async () => {
    songQueue.addSongs([song("a"), song("b")]);

    await run([song("new")], true);

    expect(played).toEqual(["a", "new"]);
  });

  it("skips to the new song when looping the queue", async () => {
    songQueue.addSongs([song("a"), song("b"), song("c")]);
    songQueue.setLoopType(LoopType.All);
    songQueue.skipSongs(2);

    await run([song("new")], true);

    expect(songQueue.getCurrentSong()?.id).toBe("new");
  });

  it("keeps the new song when skipping on an empty queue", async () => {
    await run([song("new")], true);

    expect(played).toEqual(["new"]);
    expect(queuedIds()).toEqual(["new"]);
  });

  it("does not skip the current song when nothing was found", async () => {
    songQueue.addSongs([song("a"), song("b")]);

    await run([], true);

    expect(songQueue.getCurrentSong()?.id).toBe("a");
    expect(followUp).toHaveBeenCalledTimes(1);
  });

  it("mentions songs that could not be loaded", async () => {
    const failed = { videoId: "x", error: "unavailable" };

    await run([song("a"), song("b")], null, [failed]);

    expect(followUp).toHaveBeenCalledTimes(1);
    expect(followUp.mock.calls[0][0]).toContain("1 song could not be loaded");
  });

  it("still succeeds when the play cannot be logged", async () => {
    vi.mocked(sabrinaDb.insertPlayLog).mockRejectedValueOnce(new Error("db locked"));

    await expect(run([song("new")])).resolves.toBeUndefined();

    expect(queuedIds()).toEqual(["new"]);
  });

  it("replies when adding several songs", async () => {
    songQueue.addSongs([song("a")]);

    await run([song("b"), song("c")]);

    expect(followUp).toHaveBeenCalledTimes(1);
    expect(followUp.mock.calls[0][0]).toContain("2");
  });
});
