import { GuildState } from "./GuildState.ts";
import { VideoDataRecord } from "./Db.ts";
import { log } from "./logging.ts";

export class GuildStatesManager {
    private guildStates = new Map<string, GuildState>();
    private onSongChangeCallback: (
        guildId: string,
        song: VideoDataRecord,
    ) => Promise<void>;

    constructor(
        onSongChangeCallback: (guildId: string, song: VideoDataRecord) => Promise<void>,
    ) {
        this.onSongChangeCallback = onSongChangeCallback;
    }

    /**
     * Get or create guild state for a specific guild
     */
    public getGuildState(guildId: string): GuildState {
        let guildState = this.guildStates.get(guildId);

        if (!guildState) {
            log.debug(`Creating new guild state for guild: ${guildId}`);
            guildState = new GuildState(guildId, this.onSongChangeCallback);
            this.guildStates.set(guildId, guildState);
        }

        return guildState;
    }

    /**
     * Check if a guild has an active state
     */
    public hasGuildState(guildId: string): boolean {
        return this.guildStates.has(guildId);
    }

    /**
     * Remove and destroy guild state
     */
    public removeGuildState(guildId: string): void {
        const guildState = this.guildStates.get(guildId);
        if (guildState) {
            log.debug(`Removing guild state for guild: ${guildId}`);
            guildState.destroy();
            this.guildStates.delete(guildId);
        }
    }

    /**
     * Get all guild IDs with active voice connections
     */
    public getActiveVoiceGuilds(): string[] {
        const activeGuilds: string[] = [];

        for (const [guildId, guildState] of this.guildStates) {
            if (guildState.hasActiveVoiceConnection()) {
                activeGuilds.push(guildId);
            }
        }

        return activeGuilds;
    }

    /**
     * Get all guild states with active voice connections
     */
    public getActiveGuildStates(): Map<string, GuildState> {
        const activeStates = new Map<string, GuildState>();

        for (const [guildId, guildState] of this.guildStates) {
            if (guildState.hasActiveVoiceConnection()) {
                activeStates.set(guildId, guildState);
            }
        }

        return activeStates;
    }

    /**
     * Get notification channels for all guilds with active voice connections
     */
    public getActiveNotificationChannels(): Map<string, string> {
        const activeChannels = new Map<string, string>();

        for (const [guildId, guildState] of this.guildStates) {
            if (
                guildState.hasActiveVoiceConnection() &&
                guildState.getLastInteractionChannel()
            ) {
                activeChannels.set(guildId, guildState.getLastInteractionChannel()!);
            }
        }

        return activeChannels;
    }

    /**
     * Disconnect from all active voice connections
     */
    public disconnectFromAllActiveVoice(): void {
        const activeGuilds = this.getActiveVoiceGuilds();

        for (const guildId of activeGuilds) {
            const guildState = this.guildStates.get(guildId);
            if (guildState) {
                log.info(`Disconnecting from voice in guild: ${guildId}`);
                guildState.destroy();
                this.guildStates.delete(guildId);
            }
        }
    }

    /**
     * Clean up inactive guild states (no voice connection and no recent activity)
     */
    public cleanupInactiveGuilds(): void {
        const toRemove: string[] = [];

        for (const [guildId, guildState] of this.guildStates) {
            if (!guildState.hasActiveVoiceConnection()) {
                toRemove.push(guildId);
            }
        }

        for (const guildId of toRemove) {
            this.removeGuildState(guildId);
        }
    }

    /**
     * Get total number of managed guilds
     */
    public getGuildCount(): number {
        return this.guildStates.size;
    }

    /**
     * Get total number of active voice connections
     */
    public getActiveVoiceCount(): number {
        return this.getActiveVoiceGuilds().length;
    }

    /**
     * Destroy all guild states (shutdown cleanup)
     */
    public destroyAll(): void {
        log.warn("Destroying all guild states...");

        for (const [_guildId, guildState] of this.guildStates) {
            guildState.destroy();
        }

        this.guildStates.clear();
    }
}
