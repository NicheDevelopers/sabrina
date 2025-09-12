import {ChatInputCommandInteraction, SlashCommandBuilder,} from "discord.js";
import NicheBotCommand from "../../NicheBotCommand.ts";
import QueryResolver, {QueryType} from "../QueryResolver.ts";
import YouTube from "../youtube/YouTube.ts";
import UrlValidator from "../UrlValidator.ts";
import Db from "../../db.ts";

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
  const query = QueryResolver.resolve(input);
  let videoId;

  if (query.type === QueryType.YT_SEARCH) {
    const video = await YouTube.searchFirstVideo(query.payload);
    if (!video) {
      await interaction.editReply("No results found!");
      return;
    }
    videoId = video.videoId;
  }
  if (query.type === QueryType.YT_URL) {
    const url = new URL(query.payload);
    videoId = UrlValidator.extractVideoId(url);
  }

  if (!videoId) {
    await interaction.editReply("Invalid YouTube URL!");
    return;
  }
  const record = Db.getVideoPath(videoId)
  if (record) {
    await interaction.editReply("Song is already cached!");
    return;
  }
  try {
    await YouTube.downloadAudio(videoId);
    await interaction.editReply("Song cached successfully!");
  } catch (error) {
    console.error("Error caching song:", error);
    await interaction.editReply("Failed to cache the song.");
  }
}

const cacheCommand = new NicheBotCommand(data, execute);
export default cacheCommand;
