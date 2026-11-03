import { ChatInputCommandInteraction, GuildMember, VoiceChannel } from "discord.js";
import type { VideoDataRecord } from "./Db";

/* Returns the voice channel of the member who initiated the interaction. */
export function getVoiceChannelFromInteraction(
  interaction: ChatInputCommandInteraction,
): VoiceChannel | null {
  const member = interaction.member as GuildMember;
  return member.voice.channel as VoiceChannel;
}

/* Formats a count with the correct singular/plural noun, e.g. "1 song", "2 songs" */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/* Describes what a play command added to the queue, and what it could not load */
export function queueResultMessage(
  query: string,
  videos: readonly VideoDataRecord[],
  failedCount: number,
): string {
  const failed = `${pluralize(failedCount, "song")} could not be loaded.`;

  if (videos.length === 0) {
    return failedCount > 0 ? failed : `No results found for query: "${query}"`;
  }

  const added =
    videos.length === 1
      ? `Added **${videos[0].title}** to the queue.`
      : `Added ${pluralize(videos.length, "song")} to the queue.`;

  return failedCount > 0 ? `${added} ${failed}` : added;
}

export function formatDuration(ms: number): string {
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
