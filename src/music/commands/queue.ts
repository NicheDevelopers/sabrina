import {SlashCommandBuilder} from "discord.js";
import NicheBot from "../../NicheBot";
import NicheBotCommand, {CommandContext} from "../../NicheBotCommand";
import EmbedCreator from "../EmbedCreator";

const data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current queue");

async function execute(ctx: CommandContext) {
    const guildState = NicheBot.getGuildState(ctx.guildId);
    if (guildState.songQueue.isEmpty()) {
        await ctx.interaction.followUp("The queue is empty!");
        return;
    }
    const embed = EmbedCreator.createQueueEmbed(guildState.songQueue.getQueue());
    await ctx.interaction.followUp({embeds: [embed]});
}

const queueCommand = new NicheBotCommand(data, execute, false);
export default queueCommand;
