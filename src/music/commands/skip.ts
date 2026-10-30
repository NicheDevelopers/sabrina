import { SlashCommandBuilder } from "discord.js";
import { log } from "../../logging";
import NicheBot from "../../NicheBot";
import NicheBotCommand, { type CommandContext } from "../../NicheBotCommand";

const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skips the current song")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("The number of songs to skip")
      .setRequired(false)
      .setMinValue(1),
  );

async function execute(ctx: CommandContext) {
  log.info(`[skip] Skipping song in guild ${ctx.guildId || "unknown"}`);

  const amount = ctx.interaction.options.getInteger("amount") || 1;
  const guildPlayer = NicheBot.getGuildPlayer(ctx.guildId);
  guildPlayer.songQueue.skipSongs(amount);

  log.info(`[skip] Skipped ${amount} songs in guild ${ctx.guildId}`);
  await ctx.interaction.followUp(`Skipped ${amount} songs!`);
}

const skipCommand = new NicheBotCommand(data, execute, {
  userInVoice: true,
  botInVoice: true,
});
export default skipCommand;
