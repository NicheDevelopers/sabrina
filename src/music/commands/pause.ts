import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot";
import { log } from "../../logging";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";

const data = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause the currently playing track");

async function execute(ctx: CommandContext) {
  const interaction = ctx.interaction;

  const guildPlayer = NicheBot.getGuildPlayer(ctx.guildId);
  guildPlayer.audioPlayer.pause();

  log.info(`[pause] Paused music in guild ${interaction.guildId}`);
  await interaction.followUp("Paused music!");
}

const pauseCommand = new NicheBotCommand(data, execute, {
  userInVoice: true,
  botInVoice: true,
});
export default pauseCommand;
