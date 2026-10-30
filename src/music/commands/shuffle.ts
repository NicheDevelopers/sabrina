import { SlashCommandBuilder } from "discord.js";
import { log } from "../../logging";
import NicheBot from "../../NicheBot";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";

const data = new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffles the queue");

async function execute(ctx: CommandContext) {
    log.info(`[shuffle] Shuffling queue in guild ${ctx.guildId || "unknown"}`);

    const guildPlayer = NicheBot.getGuildPlayer(ctx.guildId);
    guildPlayer.songQueue.shuffle();

    log.info(`[shuffle] Shuffled queue in guild ${ctx.guildId}`);
    await ctx.interaction.followUp(`Shuffled the queue!`);
}

const shuffleCommand = new NicheBotCommand(data, execute, {
    userInVoice: true,
    botInVoice: true,
});
export default shuffleCommand;
