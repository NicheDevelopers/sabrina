import { EventEmitter } from "node:events";
import { ChatInputCommandInteraction, VoiceChannel } from "discord.js";
import * as voice from "@discordjs/voice";
import CommandProvider from "./CommandProvider";
import NicheBot from "./NicheBot";
import NicheBotCommand from "./NicheBotCommand";
import { log } from "./logging";

jest.mock("./Config", () => ({
    ...jest.requireActual("./Config"),
    SECRET_TOKEN: "token",
    APPLICATION_ID: "app",
}));

jest.mock("@discordjs/voice", () => ({
    ...jest.requireActual("@discordjs/voice"),
    getVoiceConnection: jest.fn(),
    joinVoiceChannel: jest.fn(),
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
