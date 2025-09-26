import { SlashCommandBuilder } from "discord.js";
import { log } from "../../logging";
import NicheBot from "../../NicheBot";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";

const data = new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffles the queue");

async function execute(ctx: CommandContext) {
    log.info(`[shuffle] Shuffling queue in guild ${ctx.guildId || "unknown"}`);

    if (!NicheBot.getCurrentVoiceConnection(ctx.guildId)) {
        log.warn(
            `[skip] Command invoked but bot is not in a voice channel (guild ${ctx.guildId})`
        );
        await ctx.interaction.followUp("I'm not in a voice channel!");
        return;
    }

    const guildState = NicheBot.getGuildState(ctx.guildId);
    guildState.songQueue.shuffle();

    log.info(`[shuffle] Shuffled queue in guild ${ctx.guildId}`);
    await ctx.interaction.followUp(`Shuffled the queue!`);
}

const shuffleCommand = new NicheBotCommand(data, execute, true);
export default shuffleCommand;
