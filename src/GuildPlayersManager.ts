import { type ChannelFetcher, GuildPlayer } from "./GuildPlayer";
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
