import {ChatInputCommandInteraction, VoiceChannel} from "discord.js";
import {SlashCommandBuilder, SlashCommandOptionsOnlyBuilder} from "@discordjs/builders";

type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

export interface CommandContext {
    interaction: ChatInputCommandInteraction;
    channel: VoiceChannel | null;
    guildId: string;
}

export default class NicheBotCommand {
    data: CommandData;
    execute: (ctx: CommandContext) => Promise<void>;
    requiresVoiceConnection: boolean;

    constructor(
        data: CommandData,
        execute: (ctx: CommandContext) => Promise<void>,
        requiresVoiceConnection: boolean,
    ) {
        this.data = data;
        this.execute = execute;
        this.requiresVoiceConnection = requiresVoiceConnection;
    }
}
