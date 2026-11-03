import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from "vite-plus/test";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import {
  CategoryChannel,
  type Channel,
  ChatInputCommandInteraction,
  Client,
  InteractionContextType,
  TextChannel,
  ThreadChannel,
  VoiceChannel,
} from "discord.js";
import * as voice from "@discordjs/voice";
import CommandProvider from "./CommandProvider";
import { sabrinaDb, type VideoDataRecord } from "./Db";
import NicheBot from "./NicheBot";
import NicheBotCommand from "./NicheBotCommand";
import { log } from "./logging";
import { LoopType } from "./music/SongQueue";
import { youTube } from "./music/youtube/YouTube";

vi.mock("./Config", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  SECRET_TOKEN: "token",
  APPLICATION_ID: "app",
}));

vi.mock("@discordjs/voice", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  createAudioResource: vi.fn(),
  entersState: vi.fn(),
  getVoiceConnection: vi.fn(),
  joinVoiceChannel: vi.fn(),
}));

vi.mock("./music/youtube/YouTube", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  youTube: { findLocalOrDownload: vi.fn(), preload: vi.fn() },
}));

const actualVoice = await vi.importActual<typeof voice>("@discordjs/voice");

const client = (NicheBot as unknown as { client: EventEmitter }).client;

function makeInteraction(fields: object): ChatInputCommandInteraction {
  const interaction = Object.create(ChatInputCommandInteraction.prototype);
  return Object.assign(interaction, { isChatInputCommand: () => true, ...fields });
}

function makeGuildInteraction(followUp: Mock): ChatInputCommandInteraction {
  return makeInteraction({
    guildId: "guild",
    channelId: "channel",
    commandName: "broken",
    user: { tag: "user#0001" },
    deferReply: vi.fn().mockResolvedValue(undefined),
    followUp,
  });
}

function mockFailingCommand(failure: Error) {
  vi.spyOn(CommandProvider, "getCommand").mockReturnValue({
    data: { name: "broken" },
    requiresUserInVoice: false,
    requiresBotInVoice: false,
    execute: vi.fn().mockRejectedValue(failure),
  } as unknown as NicheBotCommand);
}

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("NicheBot crash handling", () => {
  let logError: MockInstance;

  beforeEach(() => {
    logError = vi.spyOn(log, "error").mockImplementation(() => log);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("tells the user that commands only work in a server", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = makeInteraction({
      guildId: null,
      deferred: false,
      replied: false,
      reply,
    });

    client.emit("interactionCreate", interaction);
    await flushPromises();

    expect(reply).toHaveBeenCalledWith(expect.stringContaining("server"));
  });

  it("tells the user when a command fails", async () => {
    mockFailingCommand(new Error("command failed"));
    const followUp = vi.fn().mockResolvedValue(undefined);

    client.emit("interactionCreate", makeGuildInteraction(followUp));
    await flushPromises();

    expect(followUp).toHaveBeenCalledTimes(1);
    expect(followUp.mock.calls[0][0].content).toContain("error");
  });

  it("survives failing to report a failed command", async () => {
    mockFailingCommand(new Error("command failed"));
    const expiredToken = new Error("Invalid Webhook Token");
    const followUp = vi.fn().mockRejectedValue(expiredToken);

    client.emit("interactionCreate", makeGuildInteraction(followUp));
    await flushPromises();

    expect(logError).toHaveBeenCalledWith(expect.any(String), expiredToken);
  });

  it("survives client errors", () => {
    const failure = new Error("gateway failure");

    expect(() => client.emit("error", failure)).not.toThrow();
    expect(logError).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it("survives voice connection errors", async () => {
    const connection = Object.assign(new EventEmitter(), {
      subscribe: vi.fn(),
      destroy: vi.fn(),
    });
    vi.mocked(voice.joinVoiceChannel).mockReturnValue(
      connection as unknown as voice.VoiceConnection,
    );

    const joined = NicheBot.getGuildPlayer("guild").join({
      id: "channel",
      guildId: "guild",
      guild: { voiceAdapterCreator: vi.fn() },
    } as unknown as VoiceChannel);
    connection.emit(voice.VoiceConnectionStatus.Ready);
    await joined;

    const failure = new Error("udp failure");
    expect(() => connection.emit("error", failure)).not.toThrow();
    expect(logError).toHaveBeenCalledWith(expect.any(String), failure);
  });
});

describe("NicheBot commands", () => {
  it("only registers commands for servers", () => {
    const commands = CommandProvider.getAllCommands();

    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      expect(command.data.toJSON().contexts).toEqual([InteractionContextType.Guild]);
    }
  });
});

describe("NicheBot command requirements", () => {
  const flush = () => new Promise((resolve) => setImmediate(resolve));

  function run(requirements: object, connected: boolean, userChannel: object | null) {
    const execute = vi.fn().mockResolvedValue(undefined);
    const followUp = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(CommandProvider, "getCommand").mockReturnValue({
      data: { name: "skip" },
      execute,
      ...requirements,
    } as unknown as NicheBotCommand);
    vi.mocked(voice.getVoiceConnection).mockReturnValue(
      (connected ? {} : undefined) as voice.VoiceConnection | undefined,
    );

    client.emit(
      "interactionCreate",
      makeInteraction({
        guildId: "requirements",
        channelId: "channel",
        commandName: "skip",
        user: { tag: "user#0001" },
        member: { voice: { channel: userChannel } },
        deferReply: vi.fn().mockResolvedValue(undefined),
        followUp,
      }),
    );
    return { execute, followUp };
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(voice.getVoiceConnection).mockReset();
  });

  it("refuses commands that need the bot in voice when it is not", async () => {
    const { execute, followUp } = run({ requiresBotInVoice: true }, false, null);
    await flush();

    expect(execute).not.toHaveBeenCalled();
    expect(followUp).toHaveBeenCalledWith("I'm not in a voice channel!");
  });

  it("refuses commands that need the user in voice when they are not", async () => {
    const { execute, followUp } = run({ requiresUserInVoice: true }, true, null);
    await flush();

    expect(execute).not.toHaveBeenCalled();
    expect(followUp).toHaveBeenCalledWith("Cannot get the channel you're in!");
  });

  it("runs commands when their requirements are met", async () => {
    const requirements = { requiresUserInVoice: true, requiresBotInVoice: true };
    const { execute } = run(requirements, true, { id: "voice" });
    await flush();

    expect(execute).toHaveBeenCalledTimes(1);
  });
});

describe("NicheBot shutdown", () => {
  const { client: discordClient } = NicheBot as unknown as { client: Client };

  let exit: MockInstance;
  let destroyClient: MockInstance;
  let closeDb: MockInstance;

  beforeEach(() => {
    (NicheBot as unknown as { isShuttingDown: boolean }).isShuttingDown = false;
    exit = vi.spyOn(process, "exit").mockImplementation((() => {}) as never);
    destroyClient = vi.spyOn(discordClient, "destroy").mockResolvedValue();
    closeDb = vi.spyOn(sabrinaDb, "close").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("leaves voice, disconnects and closes the database before exiting", async () => {
    const connection = { subscribe: vi.fn(), destroy: vi.fn() };
    NicheBot.getGuildPlayer("shutdown");
    vi.mocked(voice.getVoiceConnection).mockImplementation((guildId) =>
      guildId === "shutdown" ? (connection as unknown as voice.VoiceConnection) : undefined,
    );

    await NicheBot.shutdown();

    expect(connection.destroy).toHaveBeenCalledTimes(1);
    expect(destroyClient).toHaveBeenCalledTimes(1);
    expect(closeDb).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("only shuts down once when signalled twice", async () => {
    await Promise.all([NicheBot.shutdown(), NicheBot.shutdown()]);

    expect(destroyClient).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it("still exits when the cleanup fails", async () => {
    destroyClient.mockRejectedValue(new Error("gateway failure"));

    await NicheBot.shutdown();

    expect(exit).toHaveBeenCalledWith(1);
  });
});

describe("NicheBot playback", () => {
  const download = vi.mocked(youTube.findLocalOrDownload);
  const createAudioResource = vi.mocked(voice.createAudioResource);
  const entersState = vi.mocked(voice.entersState);
  const getVoiceConnection = vi.mocked(voice.getVoiceConnection);

  let guildId: string;
  let guildCount = 0;
  let endCurrentSong: () => void;

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitFor(condition: () => boolean) {
    for (let i = 0; i < 200 && !condition(); i++) {
      await sleep(10);
    }
    expect(condition()).toBe(true);
  }

  const guildPlayer = () => NicheBot.getGuildPlayer(guildId);
  const queuedIds = () =>
    guildPlayer()
      .songQueue.getQueue()
      .map((song) => song.id);
  const playedPaths = () => createAudioResource.mock.calls.map((call) => call[0]);

  function song(id: string): VideoDataRecord {
    return {
      id,
      path: null,
      title: id,
      url: null,
      timestamp: null,
      seconds: null,
      views: null,
      uploadDate: null,
      image: null,
      authorName: null,
      authorUrl: null,
    };
  }

  function makeOpusResource() {
    let ended = false;
    const stream = new Readable({
      objectMode: true,
      read() {
        setTimeout(() => {
          if (!ended) this.push(Buffer.from([0xf8, 0xff, 0xfe]));
        }, 20);
      },
    });
    endCurrentSong = () => {
      ended = true;
      stream.push(null);
    };
    return actualVoice.createAudioResource(stream, {
      inputType: actualVoice.StreamType.Opus,
    });
  }

  function subscribeStubConnection() {
    const player = guildPlayer().audioPlayer as unknown as {
      subscribe(connection: object): void;
    };
    player.subscribe({
      state: { status: "ready" },
      dispatchAudio: () => true,
      prepareAudioPacket: () => true,
      setSpeaking: () => {},
      playOpusPacket: () => {},
      on: () => {},
      off: () => {},
    });
  }

  async function startPlaying(songs: VideoDataRecord[]) {
    subscribeStubConnection();
    guildPlayer().songQueue.addSongs(songs);
    await waitFor(() => guildPlayer().audioPlayer.state.status === "playing");
  }

  function pendingDownload() {
    let finish!: (path: string) => void;
    let fail!: (error: Error) => void;
    download.mockReturnValueOnce(
      new Promise<string>((resolve, reject) => {
        finish = resolve;
        fail = reject;
      }),
    );
    return { finish, fail };
  }

  function makeConnection() {
    const connection = Object.assign(new EventEmitter(), {
      subscribe: vi.fn(),
      destroy: vi.fn(),
    });
    vi.mocked(voice.joinVoiceChannel).mockReturnValue(
      connection as unknown as voice.VoiceConnection,
    );
    return connection;
  }

  function join() {
    return guildPlayer().join({
      id: "channel",
      guildId,
      guild: { voiceAdapterCreator: vi.fn() },
    } as unknown as VoiceChannel);
  }

  async function joinThenTrack(connection: ReturnType<typeof makeConnection>) {
    await join();
    getVoiceConnection.mockReturnValue(connection as unknown as voice.VoiceConnection);
  }

  beforeEach(() => {
    guildId = `guild-${++guildCount}`;
    download.mockReset();
    download.mockImplementation(async (id) => `${id}.opus`);
    entersState.mockReset();
    getVoiceConnection.mockReset();
    createAudioResource.mockReset();
    createAudioResource.mockImplementation(makeOpusResource);
  });

  afterEach(() => {
    guildPlayer().destroy();
    vi.restoreAllMocks();
  });

  it("looks up the audio file instead of trusting the stored path", async () => {
    await startPlaying([{ ...song("a"), path: "deleted.opus" }]);

    expect(playedPaths()).toEqual(["a.opus"]);
  });

  it("plays the next song when the current one ends", async () => {
    await startPlaying([song("a"), song("b")]);

    endCurrentSong();

    await waitFor(() => playedPaths().includes("b.opus"));
    expect(queuedIds()).toEqual(["b"]);
  });

  it("preloads the next song without interrupting the current one", async () => {
    const preload = vi.mocked(youTube.preload);
    preload.mockClear();
    await startPlaying([song("a"), song("b")]);
    const status = () => guildPlayer().audioPlayer.state.status;
    const stop = vi.spyOn(guildPlayer().audioPlayer, "stop");

    await sleep(50);

    expect(preload).toHaveBeenCalledWith("b");
    expect(stop).not.toHaveBeenCalled();
    expect(status()).toBe("playing");
    expect(playedPaths()).toEqual(["a.opus"]);
  });

  it("keeps the queue intact when skipping to a song still downloading", async () => {
    await startPlaying([song("a"), song("b"), song("c")]);
    const { finish } = pendingDownload();

    guildPlayer().songQueue.skipSongs(1);
    await sleep(250);

    expect(queuedIds()).toEqual(["b", "c"]);
    expect(guildPlayer().audioPlayer.state.status).toBe("idle");

    finish("b.opus");
    await waitFor(() => playedPaths().includes("b.opus"));
    expect(playedPaths()).not.toContain("c.opus");
  });

  it("ignores a download that finishes after the queue moved on", async () => {
    await startPlaying([song("a"), song("b"), song("c")]);
    const { finish } = pendingDownload();

    guildPlayer().songQueue.skipSongs(1);
    guildPlayer().songQueue.skipSongs(1);
    finish("b.opus");
    await sleep(50);

    expect(playedPaths()).toEqual(["a.opus", "c.opus"]);
    expect(queuedIds()).toEqual(["c"]);
  });

  it("keeps the current song when a skipped song fails to download", async () => {
    await startPlaying([song("a"), song("b"), song("c")]);
    const { fail } = pendingDownload();

    guildPlayer().songQueue.skipSongs(1);
    guildPlayer().songQueue.skipSongs(1);
    fail(new Error("download failed"));
    await sleep(50);

    expect(queuedIds()).toEqual(["c"]);
  });

  it("moves past a song that fails to download", async () => {
    await startPlaying([song("a"), song("b"), song("c")]);
    const { fail } = pendingDownload();

    guildPlayer().songQueue.skipSongs(1);
    fail(new Error("download failed"));

    await waitFor(() => playedPaths().includes("c.opus"));
    expect(queuedIds()).toEqual(["c"]);
  });

  it("does not retry a failed download forever when looping", async () => {
    // Later attempts hang, so that a retry loop fails this test instead of spinning
    download.mockReturnValue(new Promise(() => {}));
    download.mockRejectedValueOnce(new Error("download failed"));
    guildPlayer().songQueue.setLoopType(LoopType.All);

    guildPlayer().songQueue.addSongs([song("a")]);
    await sleep(50);

    expect(download).toHaveBeenCalledTimes(1);
    expect(guildPlayer().songQueue.isEmpty()).toBe(true);
  });

  it("clears the queue and stops playing when leaving", async () => {
    await startPlaying([song("a"), song("b")]);
    const destroy = vi.fn();
    getVoiceConnection.mockReturnValue({
      destroy,
    } as unknown as voice.VoiceConnection);

    guildPlayer().disconnect();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(guildPlayer().songQueue.isEmpty()).toBe(true);
    expect(guildPlayer().audioPlayer.state.status).toBe("idle");
  });

  it("cleans up after being kicked from the voice channel", async () => {
    const connection = makeConnection();
    await joinThenTrack(connection);
    guildPlayer().songQueue.addSongs([song("a")]);
    entersState.mockRejectedValue(new Error("timed out"));

    connection.emit(voice.VoiceConnectionStatus.Disconnected);
    await sleep(10);

    expect(connection.destroy).toHaveBeenCalledTimes(1);
    expect(guildPlayer().songQueue.isEmpty()).toBe(true);
  });

  it("stays connected when moved to another channel", async () => {
    const connection = makeConnection();
    await joinThenTrack(connection);
    guildPlayer().songQueue.addSongs([song("a")]);

    connection.emit(voice.VoiceConnectionStatus.Disconnected);
    await sleep(10);

    expect(connection.destroy).not.toHaveBeenCalled();
    expect(queuedIds()).toEqual(["a"]);
  });

  it("cleans up when a reconnect never completes", async () => {
    const connection = makeConnection();
    await joinThenTrack(connection);
    entersState.mockImplementation((async (target: unknown, status: unknown) => {
      if (status === voice.VoiceConnectionStatus.Ready) {
        throw new Error("timed out");
      }
      return target;
    }) as never);

    connection.emit(voice.VoiceConnectionStatus.Disconnected);
    await sleep(10);

    expect(connection.destroy).toHaveBeenCalledTimes(1);
  });

  it("does not destroy a newer connection after a failed reconnect", async () => {
    const connection = makeConnection();
    await joinThenTrack(connection);
    const newer = { destroy: vi.fn() };
    entersState.mockImplementation(async () => {
      getVoiceConnection.mockReturnValue(newer as unknown as voice.VoiceConnection);
      throw new Error("timed out");
    });

    connection.emit(voice.VoiceConnectionStatus.Disconnected);
    await sleep(10);

    expect(newer.destroy).not.toHaveBeenCalled();
  });

  it("cleans up when joining times out", async () => {
    const connection = makeConnection();
    getVoiceConnection
      .mockReturnValueOnce(undefined)
      .mockReturnValue(connection as unknown as voice.VoiceConnection);
    entersState.mockRejectedValue(new Error("timed out"));

    await expect(join()).rejects.toThrow("timed out");

    expect(connection.destroy).toHaveBeenCalledTimes(1);
  });

  describe("channel messages", () => {
    let send: Mock;

    function useChannel(channel: object) {
      const { client } = NicheBot as unknown as { client: Client };
      vi.spyOn(client.channels, "fetch").mockResolvedValue(channel as Channel);
    }

    const sendableChannel = (prototype: object) =>
      Object.assign(Object.create(prototype), { send });

    beforeEach(() => {
      send = vi.fn().mockResolvedValue(undefined);
      useChannel(sendableChannel(TextChannel.prototype));
      guildPlayer().setLastInteractionChannel("channel");
    });

    it("announces each new song", async () => {
      guildPlayer().songQueue.addSongs([song("a")]);
      await waitFor(() => send.mock.calls.length > 0);

      expect(send.mock.calls[0][0].embeds).toHaveLength(1);
    });

    it("does not announce every repeat of a looped song", async () => {
      guildPlayer().songQueue.setLoopType(LoopType.One);
      guildPlayer().songQueue.addSongs([song("a")]);
      await sleep(50);

      expect(send).not.toHaveBeenCalled();
    });

    it.each([
      ["voice channel chat", VoiceChannel.prototype],
      ["a thread", ThreadChannel.prototype],
    ])("announces songs in %s", async (_name, prototype) => {
      useChannel(sendableChannel(prototype));

      guildPlayer().songQueue.addSongs([song("a")]);

      await waitFor(() => send.mock.calls.length > 0);
    });

    it("reports failed downloads in voice channel chat", async () => {
      useChannel(sendableChannel(VoiceChannel.prototype));
      download.mockRejectedValueOnce(new Error("download failed"));

      guildPlayer().songQueue.addSongs([song("a")]);

      await waitFor(() => send.mock.calls.length > 0);
      expect(send.mock.calls[0][0]).toContain("download failed");
    });

    it("keeps playing when the channel cannot receive messages", async () => {
      useChannel(Object.create(CategoryChannel.prototype));

      guildPlayer().songQueue.addSongs([song("a")]);
      await sleep(50);

      expect(playedPaths()).toEqual(["a.opus"]);
    });
  });
});
