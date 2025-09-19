import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import NicheBotCommand from "../../NicheBotCommand.ts";
import EmbedCreator from "../EmbedCreator.ts";

const data = new SlashCommandBuilder()
    .setName("about")
    .setDescription(`See information about the bot`);

async function execute(interaction: ChatInputCommandInteraction) {
    const embed = EmbedCreator.createAboutEmbed();

    await interaction.followUp({ embeds: [embed] });
}

const aboutCommand = new NicheBotCommand(data, execute);
export default aboutCommand;
