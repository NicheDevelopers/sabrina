import {
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  VoiceChannel,
} from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Joins the voice channel");

async function execute(interaction: ChatInputCommandInteraction) {
  if (NicheBot.isInVoiceChannel()) {
    await interaction.reply("I'm already in a voice channel!");
    return;
  }

  log.info("Joining voice channel...");
  const member = interaction.member as GuildMember;
  const channel = member.voice.channel as VoiceChannel | null;

  if (!channel) {
    await interaction.reply("You need to join a voice channel first!");
    return;
  }

  NicheBot.connectTo(
    channel.id,
    channel.guild.id,
    channel.guild.voiceAdapterCreator,
  );

  // prevent replying to the same interaction twice
  if (interaction.replied) return;

  await interaction.reply("Joined voice channel!");
}

const joinCommand = new NicheBotCommand(data, execute);
export default joinCommand;
