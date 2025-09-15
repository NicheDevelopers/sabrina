import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";
import Utils from "../../Utils.ts";
import { youTube } from "../youtube/YouTube.ts";
import QueryParser from "../QueryParser.ts";
import EmbedCreator from "../EmbedCreator.ts";

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
    await interaction.reply("This command can only be used in a server!");
    return;
  }

  const channel = Utils.getVoiceChannelFromInteraction(interaction);
  if (!channel) {
    await interaction.reply("Cannot get the channel you're in!");
    log.warn("Failed to obtain user voice channel");
    return;
  }

  if (!NicheBot.getCurrentVoiceConnection(interaction.guildId)) {
    await interaction.reply("I'm not in a voice channel!");

    await NicheBot.joinVoiceChannel(channel);
  }

  if (interaction.replied) {
    await interaction.editReply("Downloading the song, please wait...");
  } else {
    await interaction.reply("Downloading the song, please wait...");
  }

  const voiceConnection = NicheBot.getCurrentVoiceConnection(
    interaction.guildId,
  );
  if (!voiceConnection) {
    await interaction.editReply("Failed to join voice channel.");
    log.error("Voice connection is null after joining voice channel");
    return;
  }
  voiceConnection.subscribe(NicheBot.audioPlayer);

  const input = interaction.options.getString("query", true);
  const query = QueryParser.parse(input);

  const videoData = await youTube.resolveQuery(query);
  NicheBot.songQueue.addSongs([videoData]);
}

const playCommand = new NicheBotCommand(data, execute);
export default playCommand;
