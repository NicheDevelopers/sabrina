import { SlashCommandBuilder } from "discord.js";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand.ts";
import EmbedCreator from "../EmbedCreator.ts";

const data = new SlashCommandBuilder()
    .setName("about")
    .setDescription("See information about the bot");

async function execute(ctx: CommandContext) {
    const embed = EmbedCreator.createAboutEmbed();
    await ctx.interaction.followUp({ embeds: [embed] });
}

const aboutCommand = new NicheBotCommand(data, execute, false);
export default aboutCommand;
