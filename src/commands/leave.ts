import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import NicheBot from "../NicheBot.ts";
import { log } from "../logging.ts";
import NicheBotCommand from "../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Leaves the voice channel");

async function execute(interaction: ChatInputCommandInteraction) {
  if (!NicheBot.isInVoiceChannel()) {
    await interaction.reply("I'm not in a voice channel!");
    return;
  }

  log.info("Leaving voice channel...");

  NicheBot.disconnect();

  await interaction.reply("Left voice channel!");
}

const leaveCommand = new NicheBotCommand(data, execute);
export default leaveCommand;
