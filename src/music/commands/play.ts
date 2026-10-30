import { SlashCommandBuilder } from "discord.js";
import NicheBotCommand, { type CommandContext } from "../../NicheBotCommand";
import { enqueueFromQuery } from "./enqueueFromQuery";

const data = new SlashCommandBuilder()
  .setName("play")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("URL or search term for the song to cache")
      .setRequired(true),
  )
  .setDescription("Plays audio from a YouTube URL or search term");

async function execute(ctx: CommandContext) {
  await enqueueFromQuery(ctx, (queue, videos) => queue.addSongs(videos));
}

const playCommand = new NicheBotCommand(data, execute, { userInVoice: true });
export default playCommand;
