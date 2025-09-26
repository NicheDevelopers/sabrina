import { SlashCommandBuilder } from "@discordjs/builders";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";
import NicheBot from "../../NicheBot";
import { log } from "../../logging";
import QueryParser from "../QueryParser";
import { youTube } from "../youtube/YouTube";
import { sabrinaDb } from "../../Db";

const data = new SlashCommandBuilder()
    .setName("playnow")
    .setDescription("Play a song immediately")
    .addStringOption(option =>
        option.setName("query").setDescription("The song to play").setRequired(true)
    )
    .addBooleanOption(option =>
        option.setName("skip").setDescription("Skip the current song").setRequired(false)
    );

async function execute(ctx: CommandContext) {
    if (!NicheBot.getCurrentVoiceConnection(ctx.guildId)) {
        await NicheBot.joinVoiceChannel(ctx.channel!);
    }

    const voiceConnection = NicheBot.getCurrentVoiceConnection(ctx.guildId);
    if (!voiceConnection) {
        await ctx.interaction.followUp("Failed to join the voice channel.");
        log.error(
            `[playnow] Failed to join voice channel. Voice connection is null after joining (guild ${ctx.guildId})`
        );
        return;
    }

    const guildState = NicheBot.getGuildState(ctx.guildId);
    const input = ctx.interaction.options.getString("query", true);
    const query = QueryParser.parse(input);

    const { videos, errors } = await youTube.handleQuery(query);

    guildState.songQueue.addSongsAt(videos, 1);
    if (ctx.interaction.options.getBoolean("skip")) {
        guildState.songQueue.skipSongs(1);
    }

    log.warn(
        `[playnow] Added ${videos.length} videos to the queue at position 1. Failed fetches: ${errors.length}`
    );

    if (videos.length === 0) {
        await ctx.interaction.followUp(`No results found for query: "${input}"`);
        return;
    } else if (videos.length === 1) {
        const videoData = videos[0];
        await ctx.interaction.followUp(`Added **${videoData.title}** to the queue!`);
        await sabrinaDb.insertPlayLog(videoData.id, ctx.interaction);
        log.info(
            `[playnow] Added video ${videoData.title} (${videoData.id}) to queue in guild ${ctx.guildId}`
        );
    } else {
        await Promise.all(
            videos.map(async videoData => {
                log.info(
                    `[playnow] Added video ${videoData.title} (${videoData.id}) to queue in guild ${ctx.guildId}`
                );
                await sabrinaDb.insertPlayLog(videoData.id, ctx.interaction);
            })
        );
    }
}

const playNowCommand = new NicheBotCommand(data, execute, true);
export default playNowCommand;
