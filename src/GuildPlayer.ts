import {
    AudioPlayer,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { Channel, SendableChannels, VoiceChannel } from "discord.js";
import { VideoDataRecord } from "./Db";
import { log } from "./logging";
import EmbedCreator from "./music/EmbedCreator";
import SongQueue, { LoopType } from "./music/SongQueue";
import { youTube } from "./music/youtube/YouTube";

export const EMPTY_CHANNEL_LEAVE_DELAY_MS = 5 * 60 * 1000;

export type ChannelFetcher = (channelId: string) => Promise<Channel | null>;

export class GuildPlayer {
    public readonly guildId: string;
    public audioPlayer: AudioPlayer;
    public songQueue: SongQueue<VideoDataRecord>;
    public lastInteractionChannelId: string | null = null;
    private readonly fetchChannel: ChannelFetcher;
    private leaveTimeout: NodeJS.Timeout | null = null;
    private isStoppingPlayback: boolean = false;

    constructor(guildId: string, fetchChannel: ChannelFetcher) {
        this.guildId = guildId;
        this.fetchChannel = fetchChannel;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });

        const onQueueEmpty = async () => {
            log.debug(`[Guild ${this.guildId}] Song queue is empty.`);
            this.stopPlayback();
        };

        this.songQueue = new SongQueue<VideoDataRecord>(
            song => this.playSong(song),
            onQueueEmpty
        );

        this.setupAudioPlayerEvents();
    }

    private setupAudioPlayerEvents(): void {
        this.audioPlayer.on("stateChange", (oldState, newState) => {
            log.debug(
                `[Guild ${this.guildId}] Audio player state changed from ${oldState.status} to ${newState.status}`
            );

            const songEnded = oldState.status !== "idle" && newState.status === "idle";
            if (songEnded && !this.isStoppingPlayback) {
                log.debug(
                    `[Guild ${this.guildId}] Audio player is idle, playing next song in queue...`
                );
                this.songQueue.notifyCurrentSongFinished();
            }
        });

        this.audioPlayer.on("error", error => {
            log.error(`[Guild ${this.guildId}] Audio player error:`, error);
        });
    }

    private get voiceConnection(): VoiceConnection | undefined {
        return getVoiceConnection(this.guildId);
    }

    public isConnected(): boolean {
        return this.voiceConnection !== undefined;
    }

    /* Connect to a voice channel.
     * Returns a promise that resolves when the connection is ready.
     * Rejects if the connection fails or times out.
     */
    public async join(channel: VoiceChannel): Promise<void> {
        if (this.isConnected()) {
            log.warn(`Already connected to a voice channel in guild ${this.guildId}.`);
            return;
        }

        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        voiceConnection.on("error", error => {
            log.error(`Voice connection error for guild ${this.guildId}:`, error);
        });

        voiceConnection.on(VoiceConnectionStatus.Ready, () => {
            voiceConnection.subscribe(this.audioPlayer);
            log.info(`Voice connection ready for guild ${this.guildId}.`);
        });

        voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
            log.warn(`Voice connection disconnected for guild ${this.guildId}.`);
            this.recoverConnection(voiceConnection);
        });

        try {
            await entersState(voiceConnection, VoiceConnectionStatus.Ready, 15000);
        } catch (error) {
            this.abandonConnection(voiceConnection);
            throw error;
        }
    }

    /* Waits for a disconnected connection to come back, and gives up on it if it doesn't.
     * Moving the bot to another channel recovers on its own, kicking it never does.
     */
    private async recoverConnection(voiceConnection: VoiceConnection): Promise<void> {
        try {
            await Promise.race([
                entersState(voiceConnection, VoiceConnectionStatus.Signalling, 5000),
                entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5000),
            ]);
            await entersState(voiceConnection, VoiceConnectionStatus.Ready, 20000);
        } catch (_error) {
            log.warn(`Voice connection lost for good in guild ${this.guildId}.`);
            this.abandonConnection(voiceConnection);
        }
    }

    /* Disconnects, unless this connection has already been replaced or destroyed */
    private abandonConnection(voiceConnection: VoiceConnection): void {
        if (this.voiceConnection === voiceConnection) {
            this.disconnect();
        }
    }

    /* Disconnect from the current voice channel.
     * Cleans up the voice connection and resets state.
     */
    public disconnect(): void {
        const voiceConnection = this.voiceConnection;

        if (!voiceConnection) {
            log.warn(`Not connected to a voice channel in guild ${this.guildId}.`);
            return;
        }

        // Empty the queue, which also stops the audio player for this guild
        this.songQueue.reset();
        voiceConnection.destroy();

        log.info(`Destroyed voice connection for guild ${this.guildId}.`);
    }

    private async playSong(videoData: VideoDataRecord): Promise<void> {
        try {
            log.debug(
                `[Guild ${this.guildId}] PLAY FROM QUEUE: Now playing: ${videoData.title}`
            );

            // Immediately stop any current playback
            this.stopPlayback();

            let audioPath: string;
            try {
                audioPath = await youTube.findLocalOrDownload(videoData.id);
            } catch (downloadError) {
                log.error(
                    `[Guild ${this.guildId}] Failed to download video ${videoData.id}:`,
                    downloadError
                );

                if (this.songQueue.getCurrentSong() !== videoData) {
                    return;
                }

                // Remove it instead of skipping it, a looping queue would retry forever
                this.songQueue.removeCurrentSong();

                const channelId = this.getLastInteractionChannel();
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
                            `[Guild ${this.guildId}] Failed to send download error message:`,
                            channelError
                        );
                    }
                }

                return;
            }

            // The queue may have moved on during the download
            if (this.songQueue.getCurrentSong() !== videoData) {
                log.debug(
                    `[Guild ${this.guildId}] Skipped during download: ${videoData.id}`
                );
                return;
            }

            const audioResource = createAudioResource(audioPath);

            this.audioPlayer.play(audioResource);

            log.debug(
                `[Guild ${this.guildId}] Playing ${JSON.stringify(videoData, null, 2)}`
            );

            // Send "now playing" message to the guild's last interaction channel
            const channelId = this.getLastInteractionChannel();
            if (!channelId) {
                log.warn(
                    `[Guild ${this.guildId}] No last interaction channel found, cannot send now playing message`
                );
                return;
            }

            const channel = await this.getChannel(channelId);
            if (this.songQueue.loopType !== LoopType.One) {
                const nowPlaying = EmbedCreator.createNowPlayingEmbed(videoData);
                await channel.send({ embeds: [nowPlaying] });
                log.debug(
                    `[Guild ${this.guildId}] Sent now playing message to channel ${channelId}`
                );
            }
        } catch (error) {
            log.error(`[Guild ${this.guildId}] Error in playSong:`, error);
        }
    }

    private async getChannel(channelId: string): Promise<SendableChannels> {
        const channel = await this.fetchChannel(channelId);
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found`);
        }
        if (!channel.isSendable()) {
            throw new Error(`Channel with ID ${channelId} cannot receive messages`);
        }
        return channel;
    }

    /* Stops the audio immediately, without treating the song as finished */
    public stopPlayback(): void {
        this.isStoppingPlayback = true;
        this.audioPlayer.stop(true);
        this.isStoppingPlayback = false;
    }

    public setLastInteractionChannel(channelId: string): void {
        this.lastInteractionChannelId = channelId;
    }

    public getLastInteractionChannel(): string | null {
        return this.lastInteractionChannelId;
    }

    public scheduleLeave(onLeave: () => void): void {
        if (this.leaveTimeout) {
            return;
        }

        log.debug(`[Guild ${this.guildId}] Voice channel is empty, scheduling leave.`);
        this.leaveTimeout = setTimeout(() => {
            this.leaveTimeout = null;
            onLeave();
        }, EMPTY_CHANNEL_LEAVE_DELAY_MS);
    }

    public cancelScheduledLeave(): void {
        if (!this.leaveTimeout) {
            return;
        }

        log.debug(`[Guild ${this.guildId}] Cancelling scheduled leave.`);
        clearTimeout(this.leaveTimeout);
        this.leaveTimeout = null;
    }

    public destroy(): void {
        this.cancelScheduledLeave();
        this.stopPlayback();
        this.voiceConnection?.destroy();
        // Clear the song queue
        this.songQueue = new SongQueue<VideoDataRecord>();
    }
}
