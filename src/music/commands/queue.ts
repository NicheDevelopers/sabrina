import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import NicheBot from "../../NicheBot.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";
import EmbedCreator from "../EmbedCreator.ts";

const data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current queue");

async function execute(interaction: ChatInputCommandInteraction) {
    if (NicheBot.songQueue.isEmpty()) {
        await interaction.followUp("The queue is empty!");
        return;
    }

    const embed = EmbedCreator.createQueueEmbed(NicheBot.songQueue.getQueue());

    await interaction.followUp({ embeds: [embed] });
}

const queueCommand = new NicheBotCommand(data, execute);
export default queueCommand;
