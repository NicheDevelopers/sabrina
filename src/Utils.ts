import { ChatInputCommandInteraction, GuildMember, VoiceChannel } from "discord.js";
import * as fs from "node:fs";
import { VideoDataRecord } from "./Db";

export default class Utils {
  /* Returns the voice channel of the member who initiated the interaction. */
  public static getVoiceChannelFromInteraction(
    interaction: ChatInputCommandInteraction,
  ): VoiceChannel | null {
    const member = interaction.member as GuildMember;
    return member.voice.channel as VoiceChannel;
  }

  /* Describes what a play command added to the queue, and what it could not load */
  public static queueResultMessage(
    query: string,
    videos: readonly VideoDataRecord[],
    failedCount: number,
  ): string {
    const failed =
      failedCount === 1
        ? "1 song could not be loaded."
        : `${failedCount} songs could not be loaded.`;

    if (videos.length === 0) {
      return failedCount > 0 ? failed : `No results found for query: "${query}"`;
    }

    const added =
      videos.length === 1
        ? `Added **${videos[0].title}** to the queue.`
        : `Added ${videos.length} songs to the queue.`;

    return failedCount > 0 ? `${added} ${failed}` : added;
  }

  public static getVersion(): string {
    try {
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
      return packageJson.version;
    } catch (error) {
      console.error("Error reading package.json:", error);
      return "unknown";
    }
  }

  public static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
