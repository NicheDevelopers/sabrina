import { SlashCommandBuilder } from "@discordjs/builders";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";
import NicheBot from "../../NicheBot";
import { log } from "../../logging";
import QueryParser from "../QueryParser";
import { youTube } from "../youtube/YouTube";
import { logPlays } from "../../analytics/analytics";
import Utils from "../../Utils";

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

    log.warn(
        `[playnow] Adding ${videos.length} videos after the current song. Failed fetches: ${errors.length}`
    );

    const message = Utils.queueResultMessage(input, videos, errors.length);

    if (videos.length === 0) {
        await ctx.interaction.followUp(message);
        return;
    }

    // With nothing to skip, the new song starts on its own
    const shouldSkip =
        ctx.interaction.options.getBoolean("skip") && !guildState.songQueue.isEmpty();

    guildState.songQueue.addSongsNext(videos);
    if (shouldSkip) {
        guildState.songQueue.skipSongs(1);
    }

    await ctx.interaction.followUp(message);

    for (const videoData of videos) {
        log.info(
            `[playnow] Added video ${videoData.title} (${videoData.id}) to queue in guild ${ctx.guildId}`
        );
    }
    await logPlays(videos, ctx.interaction);
}

const playNowCommand = new NicheBotCommand(data, execute, true);
export default playNowCommand;
