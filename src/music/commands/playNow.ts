import {SlashCommandBuilder} from "npm:@discordjs/builders@1.11.3";
import NicheBotCommand from "../../NicheBotCommand.ts";
import NicheBot from "../../NicheBot.ts";
import {log} from "../../logging.ts";
import {ChatInputCommandInteraction} from "npm:discord.js@14.22.1";
import Utils from "../../Utils.ts";
import QueryParser from "../QueryParser.ts";
import {youTube} from "../youtube/YouTube.ts";

const data = new SlashCommandBuilder()
    .setName("playnow")
    .setDescription("Play a song immediately")
    .addStringOption((option) =>
        option
            .setName("query")
            .setDescription("The song to play")
            .setRequired(true)
    )
    .addBooleanOption((option) =>
        option
            .setName("skip")
            .setDescription("Skip the current song")
            .setRequired(false)
    );

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
    NicheBot.songQueue.addSongsAt([videoData], 1);
    if (interaction.options.getBoolean("skip")) {
        NicheBot.songQueue.skipSongs(1);
    }

    await interaction.followUp(`Added **${videoData.title}** to the queue.`);
}

const playNowCommand = new NicheBotCommand(data, execute);
export default playNowCommand;
