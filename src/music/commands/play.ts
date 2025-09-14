import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";
import Utils from "../../Utils.ts";
import YouTube from "../youtube/YouTube.ts";
import QueryParser from "../QueryParser.ts";
import { createAudioResource } from "npm:@discordjs/voice@0.19.0";

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
    await interaction.editReply("Playing song, please wait...");
  } else {
    await interaction.reply("Playing song, please wait...");
  }

  const input = interaction.options.getString("query", true);
  const query = QueryParser.parse(input);

  const videoData = await YouTube.getByQuery(query);

  const voiceConnection = NicheBot.getCurrentVoiceConnection(
    interaction.guildId,
  );
  if (!voiceConnection) {
    await interaction.editReply("Failed to join voice channel.");
    log.error("Voice connection is null after joining voice channel");
    return;
  }

  const audioResource = createAudioResource(videoData.path);
  voiceConnection.subscribe(NicheBot.audioPlayer);
  NicheBot.audioPlayer.play(audioResource);

  log.debug(`Playing ${JSON.stringify(videoData, null, 2)}`);

  await interaction.editReply("Playing...");

}

const playCommand = new NicheBotCommand(data, execute);
export default playCommand;
