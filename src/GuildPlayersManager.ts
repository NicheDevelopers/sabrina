import { ChannelFetcher, GuildPlayer } from "./GuildPlayer";
import { log } from "./logging";

export class GuildPlayersManager {
    private guildPlayers = new Map<string, GuildPlayer>();
    private readonly fetchChannel: ChannelFetcher;

    constructor(fetchChannel: ChannelFetcher) {
        this.fetchChannel = fetchChannel;
    }

    /**
     * Get or create the player for a specific guild
     */
    public getGuildPlayer(guildId: string): GuildPlayer {
        let guildPlayer = this.guildPlayers.get(guildId);

        if (!guildPlayer) {
            log.debug(`Creating new guild player for guild: ${guildId}`);
            guildPlayer = new GuildPlayer(guildId, this.fetchChannel);
            this.guildPlayers.set(guildId, guildPlayer);
        }

        return guildPlayer;
    }

    /**
     * Check if a guild has an active state
     */
    public hasGuildPlayer(guildId: string): boolean {
        return this.guildPlayers.has(guildId);
    }

    /**
     * Remove and destroy guild player
     */
    public removeGuildPlayer(guildId: string): void {
        const guildPlayer = this.guildPlayers.get(guildId);
        if (guildPlayer) {
            log.debug(`Removing guild player for guild: ${guildId}`);
            guildPlayer.destroy();
            this.guildPlayers.delete(guildId);
        }
    }

    /**
     * Get all guild IDs with active voice connections
     */
    public getActiveVoiceGuilds(): string[] {
        const activeGuilds: string[] = [];

        for (const [guildId, guildPlayer] of this.guildPlayers) {
            if (guildPlayer.hasActiveVoiceConnection()) {
                activeGuilds.push(guildId);
            }
        }

        return activeGuilds;
    }

    /**
     * Get all guild players with active voice connections
     */
    public getActiveGuildPlayers(): Map<string, GuildPlayer> {
        const activeStates = new Map<string, GuildPlayer>();

        for (const [guildId, guildPlayer] of this.guildPlayers) {
            if (guildPlayer.hasActiveVoiceConnection()) {
                activeStates.set(guildId, guildPlayer);
            }
        }

        return activeStates;
    }

    /**
     * Get notification channels for all guilds with active voice connections
     */
    public getActiveNotificationChannels(): Map<string, string> {
        const activeChannels = new Map<string, string>();

        for (const [guildId, guildPlayer] of this.guildPlayers) {
            if (
                guildPlayer.hasActiveVoiceConnection() &&
                guildPlayer.getLastInteractionChannel()
            ) {
                activeChannels.set(guildId, guildPlayer.getLastInteractionChannel()!);
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
            const guildPlayer = this.guildPlayers.get(guildId);
            if (guildPlayer) {
                log.info(`Disconnecting from voice in guild: ${guildId}`);
                guildPlayer.destroy();
                this.guildPlayers.delete(guildId);
            }
        }
    }

    /**
     * Clean up inactive guild players (no voice connection and no recent activity)
     */
    public cleanupInactiveGuilds(): void {
        const toRemove: string[] = [];

        for (const [guildId, guildPlayer] of this.guildPlayers) {
            if (!guildPlayer.hasActiveVoiceConnection()) {
                toRemove.push(guildId);
            }
        }

        for (const guildId of toRemove) {
            this.removeGuildPlayer(guildId);
        }
    }

    /**
     * Get total number of managed guilds
     */
    public getGuildCount(): number {
        return this.guildPlayers.size;
    }

    /**
     * Get total number of active voice connections
     */
    public getActiveVoiceCount(): number {
        return this.getActiveVoiceGuilds().length;
    }

    /**
     * Destroy all guild players (shutdown cleanup)
     */
    public destroyAll(): void {
        log.warn("Destroying all guild players...");

        for (const [_guildId, guildPlayer] of this.guildPlayers) {
            guildPlayer.destroy();
        }

        this.guildPlayers.clear();
    }
}
