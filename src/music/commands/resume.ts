import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the currently playing track");

async function execute(ctx: CommandContext) {
    const connection = NicheBot.getCurrentVoiceConnection(ctx.guildId);
    if (!connection) {
        log.warn(
            `[resume] Command invoked but bot is not in a voice channel (guild ${ctx.guildId})`,
        );
        await ctx.interaction.followUp("I'm not in a voice channel!");
        return;
    }

    const guildState = NicheBot.getGuildState(ctx.guildId);
    guildState.audioPlayer.unpause();

    log.info(`[resume] Resumed music in guild ${ctx.guildId}`);
    await ctx.interaction.followUp("Resumed music!");
}

const resumeCommand = new NicheBotCommand(data, execute, true);
export default resumeCommand;
