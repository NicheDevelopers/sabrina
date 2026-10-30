import {
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import {
    BaseInteraction,
    ChatInputCommandInteraction,
    Client,
    Events,
    GatewayIntentBits,
    Guild,
    REST,
    Routes,
    SendableChannels,
    VoiceChannel,
} from "discord.js";
import { log } from "./logging";
import CommandProvider from "./CommandProvider";
import { youTube } from "./music/youtube/YouTube";
import EmbedCreator from "./music/EmbedCreator";
import { sabrinaDb, VideoDataRecord } from "./Db";
import { GuildStatesManager } from "./GuildStatesManager";
import Utils from "./Utils";
import { CommandContext } from "./NicheBotCommand";
import { handleMessageCreate, handleVoiceStateUpdate } from "./analytics/analytics";
import { APPLICATION_ID, BOT_NAME, SECRET_TOKEN } from "./Config";
import { LoopType } from "./music/SongQueue";

export { BOT_NAME };

class NicheBotClass {
    private readonly guildStatesManager: GuildStatesManager;

    private readonly token: string = SECRET_TOKEN;
    private readonly appId: string = APPLICATION_ID;

    private readonly client: Client = this.makeClient();

    private isShuttingDown: boolean = false;

    private readonly startupTimestamp: number = Date.now();

    constructor() {
        // Initialize the guild states manager with the song change callback
        this.guildStatesManager = new GuildStatesManager(
            async (guildId: string, song: VideoDataRecord) =>
                await this.playFromQueue(guildId, song)
        );

        this.validateConfig();

        // Node signal handlers are already in main
        this.client.on(Events.Error, error => {
            log.error("Discord client error:", error);
        });
        this.client.on("interactionCreate", interaction => {
            this.onInteractionCreate(interaction).catch((error: unknown) => {
                log.error("Failed to handle interaction:", error);
            });
        });
        this.client.on("messageCreate", handleMessageCreate);
        this.client.on("voiceStateUpdate", handleVoiceStateUpdate);
        this.client.on("voiceStateUpdate", (_oldState, newState) =>
            this.updateScheduledLeave(newState.guild)
        );
    }

    public async start() {
        await this.refreshCommands();
        this.client.once(Events.ClientReady, c => {
            log.info(`Ready! Logged in as ${c.user.tag}`);
        });
        await this.client.login(this.token);
    }

    /*
     * Register slash commands with Discord API, so that the members can see them.
     */
    private async refreshCommands() {
        const commandData = CommandProvider.getAllCommands().map(c => c.data.toJSON());
        log.info(`Registering ${commandData.length} commands...`);
        const rest = new REST({ version: "10" }).setToken(this.token);

        const postCommands = rest.put(Routes.applicationCommands(this.appId), {
            body: commandData,
        });

        log.info("Refreshing application (/) commands.");
        await Promise.all([postCommands]);
        log.info("Refreshed application (/) commands.");
    }

    /*
     * Handle slash command interactions.
     * This is where the bot responds to commands.
     */
    private async onInteractionCreate(interaction: BaseInteraction) {
        if (!interaction.isCommand()) {
            return;
        }
        if (!(interaction instanceof ChatInputCommandInteraction)) {
            return;
        }
        if (!interaction.guildId) {
            log.warn("Command invoked outside of a guild");
            await interaction.reply("This command can only be used in a server!");
            return;
        }

        try {
            await interaction.deferReply();
        } catch (error) {
            log.error("Failed to defer interaction reply:", error);
            return;
        }

        const command = CommandProvider.getCommand(interaction.commandName);
        if (!command) {
            log.error(`No command matching ${interaction.commandName} was found.`);
            await interaction.followUp({
                content: "Command not found.",
                ephemeral: true,
            });
            return;
        }

        let channel: VoiceChannel | null = null;
        if (command.requiresVoiceConnection) {
            channel = Utils.getVoiceChannelFromInteraction(interaction);
            if (!channel) {
                log.warn(
                    `[play] Failed to obtain user voice channel (guild ${interaction.guildId})`
                );
                await interaction.followUp("Cannot get the channel you're in!");
                return;
            }
        }

        log.info(
            `COMMAND ${command.data.name} by ${interaction.user.tag} in guild ${interaction.guildId}`
        );

        // Update the last interaction channel for this guild
        const guildState = NicheBot.guildStatesManager.getGuildState(interaction.guildId);
        guildState.setLastInteractionChannel(interaction.channelId);

        log.debug(
            `Set last interaction channel for guild ${interaction.guildId} to: ${interaction.channelId}`
        );

        try {
            const ctx: CommandContext = {
                interaction,
                channel,
                guildId: interaction.guildId,
            };
            await command.execute(ctx);
        } catch (error) {
            log.error(`Error executing command ${command.data.name}`, error);
            await interaction.followUp({
                content: "There was an error while executing this command!",
                ephemeral: true,
            });
        }
    }

    /* Gracefully shut down the bot.
     * Cleans up resources and disconnects from Discord.
     */
    public async shutdown(): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        log.warn("Shutting down...");

        try {
            // Clean up all guild states
            this.guildStatesManager.destroyAll();

            await this.client.destroy();
            await sabrinaDb.close();

            log.warn("Bot shut down.");
            process.exit(0);
        } catch (error) {
            log.error("Failed to shut down cleanly:", error);
            process.exit(1);
        }
    }

    public getCurrentVoiceConnection(guildId: string): VoiceConnection | null {
        return getVoiceConnection(guildId) || null;
    }

    /* Connect to a voice channel.
     * Returns a promise that resolves when the connection is ready.
     * Rejects if the connection fails or times out.
     */
    public async joinVoiceChannel(channel: VoiceChannel): Promise<void> {
        const guildId = channel.guildId;
        const guildState = this.guildStatesManager.getGuildState(guildId);

        if (this.getCurrentVoiceConnection(guildId)) {
            log.warn(`Already connected to a voice channel in guild ${guildId}.`);
            return;
        }

        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        voiceConnection.on("error", error => {
            log.error(`Voice connection error for guild ${guildId}:`, error);
        });

        voiceConnection.on(VoiceConnectionStatus.Ready, () => {
            // Set the voice connection in guild state - this will also subscribe the audio player
            guildState.setVoiceConnection(voiceConnection);
            log.info(`Voice connection ready for guild ${guildId}.`);
        });

        voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
            log.warn(`Voice connection disconnected for guild ${guildId}.`);
            this.recoverConnection(guildId, voiceConnection);
        });

        try {
            await entersState(voiceConnection, VoiceConnectionStatus.Ready, 15000);
        } catch (error) {
            this.abandonConnection(guildId, voiceConnection);
            throw error;
        }
    }

    /* Waits for a disconnected connection to come back, and gives up on it if it doesn't.
     * Moving the bot to another channel recovers on its own, kicking it never does.
     */
    private async recoverConnection(
        guildId: string,
        voiceConnection: VoiceConnection
    ): Promise<void> {
        try {
            await Promise.race([
                entersState(voiceConnection, VoiceConnectionStatus.Signalling, 5000),
                entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5000),
            ]);
            await entersState(voiceConnection, VoiceConnectionStatus.Ready, 20000);
        } catch (_error) {
            log.warn(`Voice connection lost for good in guild ${guildId}.`);
            this.abandonConnection(guildId, voiceConnection);
        }
    }

    /* Disconnects, unless this connection has already been replaced or destroyed */
    private abandonConnection(guildId: string, voiceConnection: VoiceConnection): void {
        if (this.getCurrentVoiceConnection(guildId) === voiceConnection) {
            this.disconnectFrom(guildId);
        }
    }

    /* Disconnect from the current voice channel.
     * Cleans up the voice connection and resets state.
     */
    public disconnectFrom(guildId: string): void {
        const guildState = this.guildStatesManager.getGuildState(guildId);
        const voiceConnection = this.getCurrentVoiceConnection(guildId);

        if (!voiceConnection) {
            log.warn(`Not connected to a voice channel in guild ${guildId}.`);
            return;
        }

        // Empty the queue, which also stops the audio player for this guild
        guildState.songQueue.reset();
        voiceConnection.destroy();
        guildState.setVoiceConnection(null);

        log.info(`Destroyed voice connection for guild ${guildId}.`);
    }

    private updateScheduledLeave(guild: Guild): void {
        if (!this.guildStatesManager.hasGuildState(guild.id)) {
            return;
        }

        const guildState = this.guildStatesManager.getGuildState(guild.id);
        const channel = guild.members.me?.voice.channel;

        if (channel && channel.members.every(member => member.user.bot)) {
            guildState.scheduleLeave(() => {
                log.info(`Leaving empty voice channel in guild ${guild.id}.`);
                this.disconnectFrom(guild.id);
            });
        } else {
            guildState.cancelScheduledLeave();
        }
    }

    /*
     * Load configuration from environment variables.
     * Throws an error if any required variable is missing.
     */
    private validateConfig(): void {
        const missing: string[] = [];
        if (this.token === "") missing.push("SECRET_TOKEN");
        if (this.appId === "") missing.push("APPLICATION_ID");

        if (missing.length > 0) {
            throw new Error(
                `Missing required environment variables: ${missing.join(", ")}`
            );
        }
    }

    private makeClient(): Client {
        return new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
            ],
        });
    }

    public async playFromQueue(
        guildId: string,
        videoData: VideoDataRecord
    ): Promise<void> {
        try {
            const guildState = this.guildStatesManager.getGuildState(guildId);

            if (!videoData) {
                this.disconnectFrom(guildId);
                return;
            }

            log.debug(
                `[Guild ${guildId}] PLAY FROM QUEUE: Now playing: ${videoData.title}`
            );

            // Immediately stop any current playback
            guildState.stopPlayback();

            let audioPath: string;
            try {
                audioPath = await youTube.findLocalOrDownload(videoData.id);
            } catch (downloadError) {
                log.error(
                    `[Guild ${guildId}] Failed to download video ${videoData.id}:`,
                    downloadError
                );

                if (guildState.songQueue.getCurrentSong() !== videoData) {
                    return;
                }

                // Remove it instead of skipping it, a looping queue would retry forever
                guildState.songQueue.removeCurrentSong();

                const channelId = guildState.getLastInteractionChannel();
                if (channelId) {
                    try {
                        const channel = await this.getChannel(channelId);
                        const errorMessage =
                            downloadError instanceof Error
                                ? downloadError.message
                                : String(downloadError);
                        await channel.send(
                            `Failed to download video: **${videoData.title}**\nError: ${errorMessage}\nSkipping to next song...`
                        );
                    } catch (channelError) {
                        log.error(
                            `[Guild ${guildId}] Failed to send download error message:`,
                            channelError
                        );
                    }
                }

                return;
            }

            // The queue may have moved on during the download
            if (guildState.songQueue.getCurrentSong() !== videoData) {
                log.debug(`[Guild ${guildId}] Skipped during download: ${videoData.id}`);
                return;
            }

            const audioResource = createAudioResource(audioPath);

            // Use the guild-specific audio player
            guildState.audioPlayer.play(audioResource);

            log.debug(`[Guild ${guildId}] Playing ${JSON.stringify(videoData, null, 2)}`);

            // Send "now playing" message to the guild's last interaction channel
            const channelId = guildState.getLastInteractionChannel();
            if (!channelId) {
                log.warn(
                    `[Guild ${guildId}] No last interaction channel found, cannot send now playing message`
                );
                return;
            }

            const channel = await this.getChannel(channelId);
            if (guildState.songQueue.loopType !== LoopType.One) {
                const nowPlaying = EmbedCreator.createNowPlayingEmbed(videoData);
                await channel.send({ embeds: [nowPlaying] });
                log.debug(
                    `[Guild ${guildId}] Sent now playing message to channel ${channelId}`
                );
            }
        } catch (error) {
            log.error(`[Guild ${guildId}] Error in playFromQueue:`, error);
            return;
        }
    }

    private async getChannel(channelId: string): Promise<SendableChannels> {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found`);
        }
        if (!channel.isSendable()) {
            throw new Error(`Channel with ID ${channelId} cannot receive messages`);
        }
        return channel;
    }

    // Public methods for commands to access guild-specific functionality
    public getGuildState(guildId: string) {
        return this.guildStatesManager.getGuildState(guildId);
    }

    public getUptime(): number {
        return Date.now() - this.startupTimestamp;
    }
}

const NicheBot = new NicheBotClass();

export default NicheBot;
