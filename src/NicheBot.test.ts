import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import {
    CategoryChannel,
    Channel,
    ChatInputCommandInteraction,
    Client,
    TextChannel,
    ThreadChannel,
    VoiceChannel,
} from "discord.js";
import * as voice from "@discordjs/voice";
import CommandProvider from "./CommandProvider";
import { VideoDataRecord } from "./Db";
import NicheBot from "./NicheBot";
import NicheBotCommand from "./NicheBotCommand";
import { log } from "./logging";
import { LoopType } from "./music/SongQueue";
import { youTube } from "./music/youtube/YouTube";

jest.mock("./Config", () => ({
    ...jest.requireActual("./Config"),
    SECRET_TOKEN: "token",
    APPLICATION_ID: "app",
}));

jest.mock("@discordjs/voice", () => ({
    ...jest.requireActual("@discordjs/voice"),
    createAudioResource: jest.fn(),
    entersState: jest.fn(),
    getVoiceConnection: jest.fn(),
    joinVoiceChannel: jest.fn(),
}));

jest.mock("./music/youtube/YouTube", () => ({
    ...jest.requireActual("./music/youtube/YouTube"),
    youTube: { findLocalOrDownload: jest.fn() },
}));

const client = (NicheBot as unknown as { client: EventEmitter }).client;

function makeInteraction(fields: object): ChatInputCommandInteraction {
    const interaction = Object.create(ChatInputCommandInteraction.prototype);
    return Object.assign(interaction, { isCommand: () => true, ...fields });
}

function makeGuildInteraction(followUp: jest.Mock): ChatInputCommandInteraction {
    return makeInteraction({
        guildId: "guild",
        channelId: "channel",
        commandName: "broken",
        user: { tag: "user#0001" },
        deferReply: jest.fn().mockResolvedValue(undefined),
        followUp,
    });
}

function mockFailingCommand(failure: Error) {
    jest.spyOn(CommandProvider, "getCommand").mockReturnValue({
        data: { name: "broken" },
        requiresVoiceConnection: false,
        execute: jest.fn().mockRejectedValue(failure),
    } as unknown as NicheBotCommand);
}

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe("NicheBot crash handling", () => {
    let logError: jest.SpyInstance;

    beforeEach(() => {
        logError = jest.spyOn(log, "error").mockImplementation(() => log);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("tells the user that commands only work in a server", async () => {
        const reply = jest.fn().mockResolvedValue(undefined);
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
        const followUp = jest.fn().mockResolvedValue(undefined);

        client.emit("interactionCreate", makeGuildInteraction(followUp));
        await flushPromises();

        expect(followUp).toHaveBeenCalledTimes(1);
        expect(followUp.mock.calls[0][0].content).toContain("error");
    });

    it("survives failing to report a failed command", async () => {
        mockFailingCommand(new Error("command failed"));
        const expiredToken = new Error("Invalid Webhook Token");
        const followUp = jest.fn().mockRejectedValue(expiredToken);

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
        const connection = Object.assign(new EventEmitter(), { subscribe: jest.fn() });
        jest.mocked(voice.joinVoiceChannel).mockReturnValue(
            connection as unknown as voice.VoiceConnection
        );

        const joined = NicheBot.joinVoiceChannel({
            id: "channel",
            guildId: "guild",
            guild: { voiceAdapterCreator: jest.fn() },
        } as unknown as VoiceChannel);
        connection.emit(voice.VoiceConnectionStatus.Ready);
        await joined;

        const failure = new Error("udp failure");
        expect(() => connection.emit("error", failure)).not.toThrow();
        expect(logError).toHaveBeenCalledWith(expect.any(String), failure);
    });
});

describe("NicheBot playback", () => {
    const actualVoice = jest.requireActual("@discordjs/voice");
    const download = jest.mocked(youTube.findLocalOrDownload);
    const createAudioResource = jest.mocked(voice.createAudioResource);
    const entersState = jest.mocked(voice.entersState);
    const getVoiceConnection = jest.mocked(voice.getVoiceConnection);

    let guildId: string;
    let guildCount = 0;
    let endCurrentSong: () => void;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    async function waitFor(condition: () => boolean) {
        for (let i = 0; i < 200 && !condition(); i++) {
            await sleep(10);
        }
        expect(condition()).toBe(true);
    }

    const guildState = () => NicheBot.getGuildState(guildId);
    const queuedIds = () =>
        guildState()
            .songQueue.getQueue()
            .map(song => song.id);
    const playedPaths = () => createAudioResource.mock.calls.map(call => call[0]);

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
            ago: null,
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
        const player = guildState().audioPlayer as unknown as {
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
        guildState().songQueue.addSongs(songs);
        await waitFor(() => guildState().audioPlayer.state.status === "playing");
    }

    function pendingDownload() {
        let finish!: (path: string) => void;
        let fail!: (error: Error) => void;
        download.mockReturnValueOnce(
            new Promise<string>((resolve, reject) => {
                finish = resolve;
                fail = reject;
            })
        );
        return { finish, fail };
    }

    function makeConnection() {
        const connection = Object.assign(new EventEmitter(), {
            subscribe: jest.fn(),
            destroy: jest.fn(),
        });
        jest.mocked(voice.joinVoiceChannel).mockReturnValue(
            connection as unknown as voice.VoiceConnection
        );
        return connection;
    }

    function join() {
        return NicheBot.joinVoiceChannel({
            id: "channel",
            guildId,
            guild: { voiceAdapterCreator: jest.fn() },
        } as unknown as VoiceChannel);
    }

    async function joinThenTrack(connection: ReturnType<typeof makeConnection>) {
        await join();
        getVoiceConnection.mockReturnValue(
            connection as unknown as voice.VoiceConnection
        );
    }

    beforeEach(() => {
        guildId = `guild-${++guildCount}`;
        download.mockReset();
        download.mockImplementation(async id => `${id}.opus`);
        entersState.mockReset();
        getVoiceConnection.mockReset();
        createAudioResource.mockReset();
        createAudioResource.mockImplementation(makeOpusResource);
    });

    afterEach(() => {
        guildState().destroy();
        jest.restoreAllMocks();
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

    it("keeps the queue intact when skipping to a song still downloading", async () => {
        await startPlaying([song("a"), song("b"), song("c")]);
        const { finish } = pendingDownload();

        guildState().songQueue.skipSongs(1);
        await sleep(250);

        expect(queuedIds()).toEqual(["b", "c"]);
        expect(guildState().audioPlayer.state.status).toBe("idle");

        finish("b.opus");
        await waitFor(() => playedPaths().includes("b.opus"));
        expect(playedPaths()).not.toContain("c.opus");
    });

    it("ignores a download that finishes after the queue moved on", async () => {
        await startPlaying([song("a"), song("b"), song("c")]);
        const { finish } = pendingDownload();

        guildState().songQueue.skipSongs(1);
        guildState().songQueue.skipSongs(1);
        finish("b.opus");
        await sleep(50);

        expect(playedPaths()).toEqual(["a.opus", "c.opus"]);
        expect(queuedIds()).toEqual(["c"]);
    });

    it("keeps the current song when a skipped song fails to download", async () => {
        await startPlaying([song("a"), song("b"), song("c")]);
        const { fail } = pendingDownload();

        guildState().songQueue.skipSongs(1);
        guildState().songQueue.skipSongs(1);
        fail(new Error("download failed"));
        await sleep(50);

        expect(queuedIds()).toEqual(["c"]);
    });

    it("moves past a song that fails to download", async () => {
        await startPlaying([song("a"), song("b"), song("c")]);
        const { fail } = pendingDownload();

        guildState().songQueue.skipSongs(1);
        fail(new Error("download failed"));

        await waitFor(() => playedPaths().includes("c.opus"));
        expect(queuedIds()).toEqual(["c"]);
    });

    it("does not retry a failed download forever when looping", async () => {
        // Later attempts hang, so that a retry loop fails this test instead of spinning
        download.mockReturnValue(new Promise(() => {}));
        download.mockRejectedValueOnce(new Error("download failed"));
        guildState().songQueue.setLoopType(LoopType.All);

        guildState().songQueue.addSongs([song("a")]);
        await sleep(50);

        expect(download).toHaveBeenCalledTimes(1);
        expect(guildState().songQueue.isEmpty()).toBe(true);
    });

    it("clears the queue and stops playing when leaving", async () => {
        await startPlaying([song("a"), song("b")]);
        const destroy = jest.fn();
        getVoiceConnection.mockReturnValue({
            destroy,
        } as unknown as voice.VoiceConnection);

        NicheBot.disconnectFrom(guildId);

        expect(destroy).toHaveBeenCalledTimes(1);
        expect(guildState().songQueue.isEmpty()).toBe(true);
        expect(guildState().audioPlayer.state.status).toBe("idle");
    });

    it("cleans up after being kicked from the voice channel", async () => {
        const connection = makeConnection();
        await joinThenTrack(connection);
        guildState().songQueue.addSongs([song("a")]);
        entersState.mockRejectedValue(new Error("timed out"));

        connection.emit(voice.VoiceConnectionStatus.Disconnected);
        await sleep(10);

        expect(connection.destroy).toHaveBeenCalledTimes(1);
        expect(guildState().songQueue.isEmpty()).toBe(true);
    });

    it("stays connected when moved to another channel", async () => {
        const connection = makeConnection();
        await joinThenTrack(connection);
        guildState().songQueue.addSongs([song("a")]);

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
        const newer = { destroy: jest.fn() };
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
        let send: jest.Mock;

        function useChannel(channel: object) {
            const { client } = NicheBot as unknown as { client: Client };
            jest.spyOn(client.channels, "fetch").mockResolvedValue(channel as Channel);
        }

        const sendableChannel = (prototype: object) =>
            Object.assign(Object.create(prototype), { send });

        beforeEach(() => {
            send = jest.fn().mockResolvedValue(undefined);
            useChannel(sendableChannel(TextChannel.prototype));
            guildState().setLastInteractionChannel("channel");
        });

        it("announces each new song", async () => {
            guildState().songQueue.addSongs([song("a")]);
            await waitFor(() => send.mock.calls.length > 0);

            expect(send.mock.calls[0][0].embeds).toHaveLength(1);
        });

        it("does not announce every repeat of a looped song", async () => {
            guildState().songQueue.setLoopType(LoopType.One);
            guildState().songQueue.addSongs([song("a")]);
            await sleep(50);

            expect(send).not.toHaveBeenCalled();
        });

        it.each([
            ["voice channel chat", VoiceChannel.prototype],
            ["a thread", ThreadChannel.prototype],
        ])("announces songs in %s", async (_name, prototype) => {
            useChannel(sendableChannel(prototype));

            guildState().songQueue.addSongs([song("a")]);

            await waitFor(() => send.mock.calls.length > 0);
        });

        it("reports failed downloads in voice channel chat", async () => {
            useChannel(sendableChannel(VoiceChannel.prototype));
            download.mockRejectedValueOnce(new Error("download failed"));

            guildState().songQueue.addSongs([song("a")]);

            await waitFor(() => send.mock.calls.length > 0);
            expect(send.mock.calls[0][0]).toContain("download failed");
        });

        it("keeps playing when the channel cannot receive messages", async () => {
            useChannel(Object.create(CategoryChannel.prototype));

            guildState().songQueue.addSongs([song("a")]);
            await sleep(50);

            expect(playedPaths()).toEqual(["a.opus"]);
        });
    });
});
