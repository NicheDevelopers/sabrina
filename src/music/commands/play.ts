import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot";
import { log } from "../../logging";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";
import Utils from "../../Utils";
import { youTube } from "../youtube/YouTube";
import QueryParser from "../QueryParser";
import { sabrinaDb } from "../../Db";
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

    if (videos.length === 0) {
        await ctx.interaction.followUp(`No results found for query: "${input}"`);
    } else if (videos.length === 1) {
        await ctx.interaction.followUp(`Added **${videos[0].title}** to the queue.`);
        await sabrinaDb.insertPlayLog(videos[0].id, ctx.interaction);
        log.info(
            `[play] Added video ${videos[0].title} (${videos[0].id}) to queue in guild ${ctx.guildId}`
        );
    } else {
        await ctx.interaction.followUp(`Added ${videos.length} songs to the queue`);
        await Promise.all(
            videos.map(data => {
                log.info(
                    `[play] Added video ${data.title} (${data.id}) to queue in guild ${ctx.guildId}`
                );
                sabrinaDb.insertPlayLog(data.id, ctx.interaction);
            })
        );
    }
}

const playCommand = new NicheBotCommand(data, execute, true);
export default playCommand;
