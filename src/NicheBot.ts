import {
    createAudioResource,
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
    REST,
    Routes,
    TextChannel,
    VoiceChannel,
} from "discord.js";
import { log } from "./logging";
import CommandProvider from "./CommandProvider";
import { youTube } from "./music/youtube/YouTube";
import EmbedCreator from "./music/EmbedCreator";
import { VideoDataRecord } from "./Db";
import { GuildStatesManager } from "./GuildStatesManager";
import Utils from "./Utils";
import { CommandContext } from "./NicheBotCommand";
import { handleMessageCreate, handleVoiceStateUpdate } from "./analytics/analytics";
import { APPLICATION_ID, BOT_NAME, SECRET_TOKEN } from "./Config";
import { LoopType } from "./music/SongQueue";

export { BOT_NAME };

class NicheBotClass {
    private readonly guildStatesManager: GuildStatesManager;

    private token: string = SECRET_TOKEN;
    private appId: string = APPLICATION_ID;

    private client: Client = this.makeClient();

    private isShuttingDown: boolean = false;

    private startupTimestamp: number = Date.now();

    constructor() {
        // Initialize the guild states manager with the song change callback
        this.guildStatesManager = new GuildStatesManager(
            async (guildId: string, song: VideoDataRecord) =>
                await this.playFromQueue(guildId, song)
        );

        this.validateConfig();

        // Node signal handlers are already in main
        this.client.on("messageCreate", handleMessageCreate);
        this.client.on("voiceStateUpdate", handleVoiceStateUpdate);
    }

    public async start() {
        await this.refreshCommands();
        this.client.once(Events.ClientReady, c => {
            log.info(`Ready! Logged in as ${c.user.tag}`);
        });
        await this.client.login(this.token);
        this.client.on("interactionCreate", this.onInteractionCreate);
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
            await interaction.followUp("This command can only be used in a server!");
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
    private shutdown() {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        log.warn("Shutting down...");

        // Clean up all guild states
        this.guildStatesManager.destroyAll();

        this.client.destroy().then(() => {
            log.warn("Bot shut down.");
            process.exit(0);
        });
    }

    public getCurrentVoiceConnection(guildId: string): VoiceConnection | null {
        return getVoiceConnection(guildId) || null;
    }

    /* Connect to a voice channel.
     * Returns a promise that resolves when the connection is ready.
     * Rejects if the connection fails or times out.
     */
    public joinVoiceChannel(channel: VoiceChannel): Promise<void> {
        const guildId = channel.guildId;
        const guildState = this.guildStatesManager.getGuildState(guildId);

        if (this.getCurrentVoiceConnection(guildId)) {
            log.warn(`Already connected to a voice channel in guild ${guildId}.`);
            return Promise.resolve();
        }

        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Voice connection timeout"));
            }, 15000); // 15 seconds timeout

            voiceConnection.on(VoiceConnectionStatus.Ready, () => {
                // Set the voice connection in guild state - this will also subscribe the audio player
                guildState.setVoiceConnection(voiceConnection);
                clearTimeout(timeout);
                resolve();
                log.info(`Voice connection ready for guild ${guildId}.`);
            });

            voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
                clearTimeout(timeout);
                guildState.setVoiceConnection(null);
                reject(new Error("Voice connection disconnected"));
                log.warn(`Voice connection disconnected for guild ${guildId}.`);
            });
        });
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

        // Stop the audio player for this guild
        guildState.audioPlayer.stop();
        voiceConnection.destroy();
        guildState.setVoiceConnection(null);

        log.info(`Destroyed voice connection for guild ${guildId}.`);
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
            guildState.audioPlayer.stop();

            if (!videoData.path) {
                videoData.path = await youTube.findLocalOrDownload(videoData.id);
            }

            const audioResource = createAudioResource(videoData.path);
            const isPaused = guildState.audioPlayer.state.status === "paused";

            // Use the guild-specific audio player
            guildState.audioPlayer.play(audioResource);
            if (isPaused) guildState.audioPlayer.pause();

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
            if (guildState.songQueue.loopType === LoopType.One) {
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

    private async getChannel(channelId: string): Promise<TextChannel> {
        const channel = await this.client.channels.fetch(channelId);
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found`);
        }
        if (!(channel instanceof TextChannel)) {
            throw new Error(`Channel with ID ${channelId} is not text-based`);
        }
        return channel;
    }

    // Public methods for commands to access guild-specific functionality
    public getGuildState(guildId: string) {
        return this.guildStatesManager.getGuildState(guildId);
    }

    public isReady(): boolean {
        return this.client.isReady();
    }

    public getUptime(): number {
        return Date.now() - this.startupTimestamp;
    }
}

const NicheBot = new NicheBotClass();

export default NicheBot;
