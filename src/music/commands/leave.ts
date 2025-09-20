import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Leaves the voice channel");

async function execute(ctx: CommandContext) {
    const connection = NicheBot.getCurrentVoiceConnection(ctx.guildId);
    if (!connection) {
        log.warn(
            `[leave] Command invoked but bot is not in a voice channel (guild ${ctx.guildId})`,
        );
        await ctx.interaction.followUp("I'm not in a voice channel!");
        return;
    }

    log.info(`[leave] Leaving voice channel in guild ${ctx.guildId}`);
    NicheBot.disconnectFrom(ctx.guildId);
    log.info(`[leave] Left voice channel in guild ${ctx.guildId}`);

    await ctx.interaction.followUp("Left voice channel!");
}

const leaveCommand = new NicheBotCommand(data, execute, false);
export default leaveCommand;
