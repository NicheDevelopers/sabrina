import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot";
import NicheBotCommand, { type CommandContext } from "../../NicheBotCommand";
import * as EmbedCreator from "../EmbedCreator";

const data = new SlashCommandBuilder().setName("queue").setDescription("Show the current queue");

async function execute(ctx: CommandContext) {
  const guildPlayer = NicheBot.getGuildPlayer(ctx.guildId);
  if (guildPlayer.songQueue.isEmpty()) {
    await ctx.interaction.followUp("The queue is empty!");
    return;
  }
  const embed = EmbedCreator.createQueueEmbed(guildPlayer.songQueue.getQueue());
  await ctx.interaction.followUp({ embeds: [embed] });
}

const queueCommand = new NicheBotCommand(data, execute);
export default queueCommand;
