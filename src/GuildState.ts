import {
    AudioPlayer,
    createAudioPlayer,
    NoSubscriberBehavior,
    VoiceConnection,
} from "@discordjs/voice";
import SongQueue from "./music/SongQueue";
import { VideoDataRecord } from "./Db";
import { log } from "./logging";

export const EMPTY_CHANNEL_LEAVE_DELAY_MS = 5 * 60 * 1000;

export class GuildState {
    public readonly guildId: string;
    public audioPlayer: AudioPlayer;
    public songQueue: SongQueue<VideoDataRecord>;
    public lastInteractionChannelId: string | null = null;
    public voiceConnection: VoiceConnection | null = null;
    private leaveTimeout: NodeJS.Timeout | null = null;
    private isStoppingPlayback: boolean = false;

    constructor(
        guildId: string,
        onSongChange: (guildId: string, song: VideoDataRecord) => Promise<void>
    ) {
        this.guildId = guildId;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });

        const onQueueEmpty = async () => {
            log.debug(`[Guild ${this.guildId}] Song queue is empty.`);
            this.stopPlayback();
        };

        this.songQueue = new SongQueue<VideoDataRecord>(async song => {
            await onSongChange(this.guildId, song);
        }, onQueueEmpty);

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

    public hasActiveVoiceConnection(): boolean {
        return (
            this.voiceConnection !== null &&
            this.voiceConnection.state.status !== "destroyed" &&
            this.voiceConnection.state.status !== "disconnected"
        );
    }

    public setVoiceConnection(connection: VoiceConnection | null): void {
        this.voiceConnection = connection;
        if (connection) {
            connection.subscribe(this.audioPlayer);
        }
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
        if (this.voiceConnection) {
            this.voiceConnection.destroy();
            this.voiceConnection = null;
        }
        // Clear the song queue
        this.songQueue = new SongQueue<VideoDataRecord>();
    }
}
