import { ChatInputCommandInteraction } from "discord.js";

export default class NicheBotCommand {
  data: any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;

  constructor(
    data: any,
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>
  ) {
    this.data = data;
    this.execute = execute;
  }
}
