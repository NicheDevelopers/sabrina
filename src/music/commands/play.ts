import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot";
import { log } from "../../logging";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";
import Utils from "../../Utils";
import { youTube } from "../youtube/YouTube";
import QueryParser from "../QueryParser";
import { logPlays } from "../../analytics/analytics";
import YouTubeQueryResolver from "../youtube/YouTubeQueryResolver";

const data = new SlashCommandBuilder()
    .setName("play")
    .addStringOption(option =>
        option
            .setName("query")
            .setDescription("URL or search term for the song to cache")
            .setRequired(true)
    )
    .setDescription("Plays audio from a YouTube URL or search term");

async function execute(ctx: CommandContext) {
    if (!ctx.guildId) {
        log.warn("[play] Command invoked outside of a guild");
        await ctx.interaction.followUp("This command can only be used in a server!");
        return;
    }

    const channel = Utils.getVoiceChannelFromInteraction(ctx.interaction);
    if (!channel) {
        log.warn(
            `[play] Failed to obtain user voice channel (guild ${ctx.interaction.guildId})`
        );
        await ctx.interaction.followUp("Cannot get the channel you're in!");
        return;
    }

    if (!NicheBot.getCurrentVoiceConnection(ctx.guildId)) {
        await NicheBot.joinVoiceChannel(channel);
    }

    const voiceConnection = NicheBot.getCurrentVoiceConnection(ctx.guildId);

    if (!voiceConnection) {
        await ctx.interaction.followUp("Failed to join the voice channel.");
        log.error(
            `[play] Failed to join voice channel. Voice connection is null after joining (guild ${ctx.guildId})`
        );
        return;
    }

    const guildState = NicheBot.getGuildState(ctx.guildId);
    const input = ctx.interaction.options.getString("query", true);
    const query = QueryParser.parse(input);

    const { videos, errors } = await youTube.handleQuery(query);
    guildState.songQueue.addSongs(videos);

    await ctx.interaction.followUp(
        Utils.queueResultMessage(input, videos, errors.length)
    );

    for (const video of videos) {
        log.info(
            `[play] Added video ${video.title} (${video.id}) to queue in guild ${ctx.guildId}`
        );
    }
    await logPlays(videos, ctx.interaction);
}

const playCommand = new NicheBotCommand(data, execute, true);
export default playCommand;
