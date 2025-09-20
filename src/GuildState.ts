import {AudioPlayer, createAudioPlayer, NoSubscriberBehavior, VoiceConnection,} from "npm:@discordjs/voice";
import SongQueue from "./music/SongQueue.ts";
import {VideoDataRecord} from "./Db.ts";
import {log} from "./logging.ts";

export class GuildState {
    public readonly guildId: string;
    public audioPlayer: AudioPlayer;
    public songQueue: SongQueue<VideoDataRecord>;
    public lastInteractionChannelId: string | null = null;
    public voiceConnection: VoiceConnection | null = null;

    constructor(
        guildId: string,
        onSongChange: (guildId: string, song: VideoDataRecord) => Promise<void>,
    ) {
        this.guildId = guildId;
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });

        this.songQueue = new SongQueue<VideoDataRecord>(async (song) => {
            await onSongChange(this.guildId, song);
        });

        this.setupAudioPlayerEvents();
    }

    private setupAudioPlayerEvents(): void {
        this.audioPlayer.on("stateChange", (oldState, newState) => {
            log.debug(
                `[Guild ${this.guildId}] Audio player state changed from ${oldState.status} to ${newState.status}`,
            );

            if (oldState.status === "playing" && newState.status === "idle") {
                log.debug(
                    `[Guild ${this.guildId}] Audio player is idle, playing next song in queue...`,
                );
                this.songQueue.notifyCurrentSongFinished();
            }
        });

        this.audioPlayer.on("error", (error) => {
            log.error(`[Guild ${this.guildId}] Audio player error:`, error);
        });
    }

    public setLastInteractionChannel(channelId: string): void {
        this.lastInteractionChannelId = channelId;
    }

    public getLastInteractionChannel(): string | null {
        return this.lastInteractionChannelId;
    }

    public hasActiveVoiceConnection(): boolean {
        return this.voiceConnection !== null &&
            this.voiceConnection.state.status !== "destroyed" &&
            this.voiceConnection.state.status !== "disconnected";
    }

    public setVoiceConnection(connection: VoiceConnection | null): void {
        this.voiceConnection = connection;
        if (connection) {
            connection.subscribe(this.audioPlayer);
        }
    }

    public destroy(): void {
        this.audioPlayer.stop();
        if (this.voiceConnection) {
            this.voiceConnection.destroy();
            this.voiceConnection = null;
        }
        // Clear the song queue
        this.songQueue = new SongQueue<VideoDataRecord>();
    }
}
