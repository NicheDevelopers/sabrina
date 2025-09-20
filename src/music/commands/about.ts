import {SlashCommandBuilder} from "discord.js";
import NicheBotCommand, {CommandContext} from "../../NicheBotCommand";
import EmbedCreator from "../EmbedCreator";

const data = new SlashCommandBuilder()
    .setName("about")
    .setDescription("See information about the bot");

async function execute(ctx: CommandContext) {
    const embed = EmbedCreator.createAboutEmbed();
    await ctx.interaction.followUp({embeds: [embed]});
}

const aboutCommand = new NicheBotCommand(data, execute, false);
export default aboutCommand;
