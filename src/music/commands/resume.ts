import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot";
import { log } from "../../logging";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";

const data = new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Resume the currently playing track");

async function execute(ctx: CommandContext) {
    const guildPlayer = NicheBot.getGuildPlayer(ctx.guildId);
    guildPlayer.audioPlayer.unpause();

    log.info(`[resume] Resumed music in guild ${ctx.guildId}`);
    await ctx.interaction.followUp("Resumed music!");
}

const resumeCommand = new NicheBotCommand(data, execute, {
    userInVoice: true,
    botInVoice: true,
});
export default resumeCommand;
