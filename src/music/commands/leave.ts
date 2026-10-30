import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot";
import { log } from "../../logging";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";

const data = new SlashCommandBuilder().setName("leave").setDescription("Leaves the voice channel");

async function execute(ctx: CommandContext) {
  log.info(`[leave] Leaving voice channel in guild ${ctx.guildId}`);
  NicheBot.getGuildPlayer(ctx.guildId).disconnect();
  log.info(`[leave] Left voice channel in guild ${ctx.guildId}`);

  await ctx.interaction.followUp("Left voice channel!");
}

const leaveCommand = new NicheBotCommand(data, execute, { botInVoice: true });
export default leaveCommand;
