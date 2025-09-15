import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause the currently playing track");

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    log.warn("Leave command invoked outside of a guild");
    await interaction.reply("This command can only be used in a server!");
    return;
  }

  const connection = NicheBot.getCurrentVoiceConnection(interaction.guildId);
  if (!connection) {
    log.warn("Leave command invoked but bot is not in a voice channel");
    await interaction.reply("I'm not in a voice channel!");
    return;
  }

  NicheBot.audioPlayer.pause();

  log.info("Paused music");
  await interaction.reply("Paused music!");
}

const pauseCommand = new NicheBotCommand(data, execute);
export default pauseCommand;
