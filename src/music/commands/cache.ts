import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBotCommand from "../../NicheBotCommand.ts";
import QueryParser, { QueryKind } from "../QueryParser.ts";
import YouTube, { youTube } from "../youtube/YouTube.ts";
import { log } from "../../logging.ts";
import Utils from "../../Utils.ts";

const data = new SlashCommandBuilder()
    .setName("cache")
    .setDescription("Cache a song for later use").addStringOption((option) =>
        option
            .setName("query")
            .setDescription("URL or search term for the song to cache")
            .setRequired(true)
    );

async function execute(interaction: ChatInputCommandInteraction) {
    try {
        await Utils.reply(interaction, "Caching song, please wait...");
        const input = interaction.options.getString("query", true);
        const query = QueryParser.parse(input);
        const videoId = (await youTube.handleQuery(query)).id;

        await youTube.download(videoId);
        await Utils.reply(interaction, `Cached song for query: ${input}`);
    } catch (e: unknown) {
        log.error("Error caching song", e);
        await Utils.reply(
            interaction,
            `Failed to cache song for query. Error: ${e}`,
        );
    }
}

const cacheCommand = new NicheBotCommand(data, execute);
export default cacheCommand;
