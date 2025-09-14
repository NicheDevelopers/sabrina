import { ChatInputCommandInteraction } from "discord.js";
import {
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "npm:@discordjs/builders@1.11.3";

type CommandData = SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;

export default class NicheBotCommand {
  data: CommandData;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;

  constructor(
    data: CommandData,
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>,
  ) {
    this.data = data;
    this.execute = execute;
  }
}
