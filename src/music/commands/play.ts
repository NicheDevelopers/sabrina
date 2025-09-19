import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import NicheBot from "../../NicheBot.ts";
import {log} from "../../logging.ts";
import NicheBotCommand from "../../NicheBotCommand.ts";
import Utils from "../../Utils.ts";
import {youTube} from "../youtube/YouTube.ts";
import QueryParser from "../QueryParser.ts";
import {sabrinaDb} from "../../Db.ts";

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
        log.warn("Play command invoked outside of a guild");
        await interaction.followUp("This command can only be used in a server!");
        return;
    }

    const channel = Utils.getVoiceChannelFromInteraction(interaction);
    if (!channel) {
        log.warn("Failed to obtain user voice channel");
        await interaction.followUp("Cannot get the channel you're in!");
        return;
    }

    if (!NicheBot.getCurrentVoiceConnection(interaction.guildId)) {
        await NicheBot.joinVoiceChannel(channel);
    }

    const voiceConnection = NicheBot.getCurrentVoiceConnection(
        interaction.guildId,
    );

    if (!voiceConnection) {
        await interaction.followUp("Failed to join the voice channel.");
        log.error(
            "Failed to join voice channel. Voice connection is null after joining voice channel",
        );
        return;
    }
    voiceConnection.subscribe(NicheBot.audioPlayer);

    const input = interaction.options.getString("query", true);
    const query = QueryParser.parse(input);

    const videoData = await youTube.handleQuery(query);
    NicheBot.songQueue.addSongs([videoData]);

    await interaction.followUp(`Added **${videoData.title}** to the queue.`);

    sabrinaDb.insertPlayLog(videoData.id, interaction);
}

const playCommand = new NicheBotCommand(data, execute);
export default playCommand;
