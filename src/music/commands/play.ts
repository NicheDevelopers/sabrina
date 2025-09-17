import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";
import Utils from "../../Utils.ts";
import { youTube } from "../youtube/YouTube.ts";
import QueryParser from "../QueryParser.ts";

const data = new SlashCommandBuilder()
  .setName("play")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("URL or search term for the song to cache")
      .setRequired(true)
  )
  .setDescription("Plays audio from a YouTube URL or search term");

async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    await Utils.reply(
      interaction,
      "This command can only be used in a server!",
    );
    return;
  }

  const channel = Utils.getVoiceChannelFromInteraction(interaction);
  if (!channel) {
    await Utils.reply(interaction, "Cannot get the channel you're in!");
    log.warn("Failed to obtain user voice channel");
    return;
  }

  if (!NicheBot.getCurrentVoiceConnection(interaction.guildId)) {
    await Utils.reply(interaction, "I'm not in a voice channel!");

    await NicheBot.joinVoiceChannel(channel);
  }

  await Utils.reply(interaction, "Downloading the song, please wait...");

  const voiceConnection = NicheBot.getCurrentVoiceConnection(
    interaction.guildId,
  );
  if (!voiceConnection) {
    await Utils.reply(interaction, "Failed to join voice channel.");
    log.error("Voice connection is null after joining voice channel");
    return;
  }
  voiceConnection.subscribe(NicheBot.audioPlayer);

  const input = interaction.options.getString("query", true);
  const query = QueryParser.parse(input);

  const videoData = await youTube.handleQuery(query);
  NicheBot.songQueue.addSongs([videoData]);
}

const playCommand = new NicheBotCommand(data, execute);
export default playCommand;
