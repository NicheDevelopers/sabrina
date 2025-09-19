import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBotCommand from "../../NicheBotCommand.ts";
import QueryParser from "../QueryParser.ts";
import { youTube } from "../youtube/YouTube.ts";
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
    const input = interaction.options.getString("query", true);
    const query = QueryParser.parse(input);
    const videoDataRecord = await youTube.handleQuery(query)

    await youTube.download(videoDataRecord.id);

    await interaction.reply(`Cached **${videoDataRecord.title}** for later!`);
}

const cacheCommand = new NicheBotCommand(data, execute);
export default cacheCommand;
