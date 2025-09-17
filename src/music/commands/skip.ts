import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { createAudioResource } from "@discordjs/voice";
import { log } from "../../logging.ts";
import NicheBot from "../../NicheBot.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";
import Utils from "../../Utils.ts";

const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skips the current song")
  .addIntegerOption((option) =>
    option
      .setName("amount")
      .setDescription("The number of songs to skip")
      .setRequired(false)
      .setMinValue(1)
  );

async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  log.info("Skipping song...");

  if (!interaction.guildId) {
    log.warn("Skip command invoked outside of a guild");
    await Utils.reply(
      interaction,
      "This command can only be used in a server!",
    );
    return;
  }
  if (!NicheBot.getCurrentVoiceConnection(interaction.guildId)) {
    await Utils.reply(interaction, "I'm not in a voice channel!");
    return;
  }

  const amount = interaction.options.getInteger("amount") || 1;

  NicheBot.songQueue.skipSongs(amount);

  await Utils.reply(interaction, `Skipped ${amount} songs!`);
}

const skipCommand = new NicheBotCommand(data, execute);
export default skipCommand;
