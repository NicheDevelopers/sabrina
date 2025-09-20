import {SlashCommandBuilder} from "discord.js";
import NicheBotCommand, {CommandContext} from "../../NicheBotCommand.ts";
import QueryParser from "../QueryParser.ts";
import {youTube} from "../youtube/YouTube.ts";
import {log} from "../../logging.ts";

const data = new SlashCommandBuilder()
    .setName("cache")
    .setDescription("Cache a song for later use").addStringOption((option) =>
        option
            .setName("query")
            .setDescription("URL or search term for the song to cache")
            .setRequired(true)
    );

async function execute(ctx: CommandContext) {
    const input = ctx.interaction.options.getString("query", true);
    const query = QueryParser.parse(input);
    const videoDataRecord = await youTube.handleQuery(query);

    await youTube.download(videoDataRecord.id);

    log.info(`[cache] Cached video: ${videoDataRecord.title} (${videoDataRecord.id})`);
    await ctx.interaction.reply(`Cached **${videoDataRecord.title}** for later!`);
}

const cacheCommand = new NicheBotCommand(data, execute, false);
export default cacheCommand;
