import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  VoiceChannel,
} from "discord.js";

type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  channel: VoiceChannel | null;
  guildId: string;
}

export interface CommandRequirements {
  userInVoice?: boolean;
  botInVoice?: boolean;
}

export default class NicheBotCommand {
  data: CommandData;
  execute: (ctx: CommandContext) => Promise<void>;
  requiresUserInVoice: boolean;
  requiresBotInVoice: boolean;

  constructor(
    data: CommandData,
    execute: (ctx: CommandContext) => Promise<void>,
    requirements: CommandRequirements = {},
  ) {
    this.data = data;
    this.execute = execute;
    this.requiresUserInVoice = requirements.userInVoice ?? false;
    this.requiresBotInVoice = requirements.botInVoice ?? false;
  }
}
