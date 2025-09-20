import {SlashCommandBuilder} from "discord.js";
import {log} from "../../logging";
import NicheBot from "../../NicheBot";
import NicheBotCommand, {CommandContext} from "../../NicheBotCommand";

const data = new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the current song")
    .addIntegerOption((option) =>
        option
            .setName("amount")
            .setDescription("The number of songs to skip")
            .setRequired(false)
            .setMinValue(1)
    );

async function execute(ctx: CommandContext) {
    log.info(`[skip] Skipping song in guild ${ctx.guildId || "unknown"}`);

    if (!NicheBot.getCurrentVoiceConnection(ctx.guildId)) {
        log.warn(
            `[skip] Command invoked but bot is not in a voice channel (guild ${ctx.guildId})`,
        );
        await ctx.interaction.followUp("I'm not in a voice channel!");
        return;
    }

    const amount = ctx.interaction.options.getInteger("amount") || 1;
    const guildState = NicheBot.getGuildState(ctx.guildId);
    guildState.songQueue.skipSongs(amount);

    log.info(`[skip] Skipped ${amount} songs in guild ${ctx.guildId}`);
    await ctx.interaction.followUp(`Skipped ${amount} songs!`);
}

const skipCommand = new NicheBotCommand(data, execute, true);
export default skipCommand;
