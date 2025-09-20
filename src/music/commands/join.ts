import {SlashCommandBuilder} from "discord.js";
import NicheBot from "../../NicheBot.ts";
import {log} from "../../logging.ts";
import NicheBotCommand, {CommandContext} from "../../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
    .setName("join")
    .setDescription("Joins the voice channel");

async function execute(ctx: CommandContext) {
    if (NicheBot.getCurrentVoiceConnection(ctx.guildId)) {
        log.info(`[join] Already in a voice channel (guild ${ctx.guildId})`);
        await ctx.interaction.followUp("I'm already in a voice channel!");
        return;
    }

    await NicheBot.joinVoiceChannel(ctx.channel!);
    log.info(`[join] Joined voice channel in guild ${ctx.guildId}`);
    await ctx.interaction.followUp("Joined voice channel!");
}

const joinCommand = new NicheBotCommand(data, execute, true);
export default joinCommand;
