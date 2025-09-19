import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { VideoDataRecord } from "../../Db.ts";
import { log } from "../../logging.ts";
import NicheBot from "../../NicheBot.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";

const data = new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Show the current queue");

async function execute(interaction: ChatInputCommandInteraction) {
    if (!NicheBot.getCurrentVoiceConnection(interaction.guild!.id!)) {
        await interaction.reply("I'm not in a voice channel!");
        return;
    }

    if (NicheBot.songQueue.isEmpty()) {
        await interaction.reply("The queue is empty!");
        return;
    }

    log.debug(NicheBot.songQueue.getQueue());

    const reply = "Current queue:\n" +
        NicheBot.songQueue
            .getQueue()
            .map((v: VideoDataRecord, i: number) => `${i + 1}. ${v.title}`)
            .join("\n")
            .slice(0, 2000); // limit to 2000 characters

    interaction.reply(reply);
}

const queueCommand = new NicheBotCommand(data, execute);
export default queueCommand;
