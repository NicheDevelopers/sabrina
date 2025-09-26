import { SlashCommandBuilder } from "discord.js";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";
import QueryParser from "../QueryParser";
import { youTube, isVideoDataFetchError } from "../youtube/YouTube";
import { log } from "../../logging";

const data = new SlashCommandBuilder()
    .setName("cache")
    .setDescription("Cache a song for later use")
    .addStringOption(option =>
        option
            .setName("query")
            .setDescription("URL or search term for the song to cache")
            .setRequired(true)
    );

async function execute(ctx: CommandContext) {
    const input = ctx.interaction.options.getString("query", true);
    const query = QueryParser.parse(input);

    const { videos, errors } = await youTube.handleQuery(query);

    const promises = videos.map(async data => {
        if (isVideoDataFetchError(data)) {
            return null;
        }
        await youTube.findLocalOrDownload(data.id);
        log.info(`[cache] Cached video: ${data.title} (${data.id})`);
        return data;
    });

    const downloadResults = await Promise.all(promises);
    const titles = downloadResults.filter(v => v !== null).map(v => v.title);
    const nulls = downloadResults.filter(v => v === null).length;

    log.info(
        `[cache] Cached ${titles.length} out of ${videos.length} videos. Failed fetches): ${errors.length}. Download errors: ${nulls}`
    );
    if (titles.length === 0) {
        await ctx.interaction.followUp(`No results found for query: "${input}"`);
    } else if (titles.length === 1) {
        await ctx.interaction.followUp(`Cached **${titles[0]}**.`);
    } else {
        await ctx.interaction.followUp(
            `Cached ${titles.length} songs:\n${titles.join("\n")}`
        );
    }
}

const cacheCommand = new NicheBotCommand(data, execute, false);
export default cacheCommand;
