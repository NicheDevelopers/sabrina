import { ChatInputCommandInteraction } from "discord.js";
import {SlashCommandBuilder} from "npm:@discordjs/builders@1.11.3";

export default class NicheBotCommand {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;

  constructor(
    data: SlashCommandBuilder,
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>,
  ) {
    this.data = data;
    this.execute = execute;
  }
}
