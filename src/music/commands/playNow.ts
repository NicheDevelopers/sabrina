import { SlashCommandBuilder } from "npm:@discordjs/builders@1.11.3";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand.ts";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import QueryParser from "../QueryParser.ts";
import { youTube } from "../youtube/YouTube.ts";
import { sabrinaDb } from "../../Db.ts";

const data = new SlashCommandBuilder()
    .setName("playnow")
    .setDescription("Play a song immediately")
    .addStringOption((option) =>
        option
            .setName("query")
            .setDescription("The song to play")
            .setRequired(true)
    )
    .addBooleanOption((option) =>
        option
            .setName("skip")
            .setDescription("Skip the current song")
            .setRequired(false)
    );

async function execute(ctx: CommandContext) {
    if (!NicheBot.getCurrentVoiceConnection(ctx.guildId)) {
        await NicheBot.joinVoiceChannel(ctx.channel!);
    }

    const voiceConnection = NicheBot.getCurrentVoiceConnection(
        ctx.guildId,
    );
    if (!voiceConnection) {
        await ctx.interaction.followUp("Failed to join the voice channel.");
        log.error(
            `[playnow] Failed to join voice channel. Voice connection is null after joining (guild ${ctx.guildId})`,
        );
        return;
    }

    const guildState = NicheBot.getGuildState(ctx.guildId);
    const input = ctx.interaction.options.getString("query", true);
    const query = QueryParser.parse(input);
    const videoData = await youTube.handleQuery(query);
    guildState.songQueue.addSongsAt([videoData], 1);
    if (ctx.interaction.options.getBoolean("skip")) {
        guildState.songQueue.skipSongs(1);
    }
    await ctx.interaction.followUp(`Added **${videoData.title}** to the queue.`);
    sabrinaDb.insertPlayLog(videoData.id, ctx.interaction);
    log.info(
        `[playnow] Added video ${videoData.title} (${videoData.id}) to queue in guild ${ctx.guildId}`,
    );
}

const playNowCommand = new NicheBotCommand(data, execute, true);
export default playNowCommand;
