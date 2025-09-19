import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {log} from "../../logging.ts";
import NicheBot from "../../NicheBot.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";

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
        await interaction.reply("This command can only be used in a server!");
        return;
    }

    if (!NicheBot.getCurrentVoiceConnection(interaction.guildId)) {
        log.warn("Skip command invoked but bot is not in a voice channel");
        await interaction.reply("I'm not in a voice channel!");
        return;
    }

    const amount = interaction.options.getInteger("amount") || 1;

    NicheBot.songQueue.skipSongs(amount);

    log.info(`Skipped ${amount} songs`);
    await interaction.reply(`Skipped ${amount} songs!`);
}

const skipCommand = new NicheBotCommand(data, execute);
export default skipCommand;
