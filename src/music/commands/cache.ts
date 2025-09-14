import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBotCommand from "../../NicheBotCommand.ts";
import QueryParser, { QueryKind } from "../QueryParser.ts";
import YouTube from "../youtube/YouTube.ts";
import { log } from "../../logging.ts";

const data = new SlashCommandBuilder()
  .setName("cache")
  .setDescription("Cache a song for later use").addStringOption((option) =>
    option
      .setName("query")
      .setDescription("URL or search term for the song to cache")
      .setRequired(true)
  );

async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.reply("Caching song, please wait...");
  const input = interaction.options.getString("query", true);
  const query = QueryParser.parse(input);

  try {
    await YouTube.getByQuery(query);
    await interaction.editReply(`Cached song for query: ${input}`);
  } catch (e: unknown) {
    log.error("Error caching song", e);
    await interaction.editReply(
      `Failed to cache song for query. Error: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}

const cacheCommand = new NicheBotCommand(data, execute);
export default cacheCommand;
