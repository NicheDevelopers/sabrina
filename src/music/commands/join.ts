import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot.ts";
import { log } from "../../logging.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";
import Utils from "../../Utils.ts";

const data = new SlashCommandBuilder()
    .setName("join")
    .setDescription("Joins the voice channel");

async function execute(interaction: ChatInputCommandInteraction | any) {
    if (NicheBot.getCurrentVoiceConnection(interaction)) {
        await interaction.reply("I'm already in a voice channel!");
        return;
    }

    log.info("Joining voice channel...");
    await interaction.reply("Joining voice channel...");

    const channel = Utils.getVoiceChannelFromInteraction(interaction);
    if (!channel) {
        await interaction.reply("Cannot get the channel you're in!");
        log.warn("Failed to obtain user voice channel");
    }

    await NicheBot.joinVoiceChannel(channel!);

    await interaction.editReply("Joined voice channel!");
}

const joinCommand = new NicheBotCommand(data, execute);
export default joinCommand;
