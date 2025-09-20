import { ChatInputCommandInteraction } from "discord.js";
import {
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
} from "npm:@discordjs/builders@1.11.3";
import { VoiceChannel } from "npm:discord.js@14.22.1";

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
