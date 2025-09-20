import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pause the currently playing track");

async function execute(ctx: CommandContext) {
    const interaction = ctx.interaction;

    const connection = NicheBot.getCurrentVoiceConnection(ctx.guildId);
    if (!connection) {
        log.warn(
            `[pause] Command invoked but bot is not in a voice channel (guild ${interaction.guildId})`,
        );
        await interaction.followUp("I'm not in a voice channel!");
        return;
    }

    const guildState = NicheBot.getGuildState(ctx.guildId);
    guildState.audioPlayer.pause();

    log.info(`[pause] Paused music in guild ${interaction.guildId}`);
    await interaction.followUp("Paused music!");
}

const pauseCommand = new NicheBotCommand(data, execute, true);
export default pauseCommand;
