import { VideoDataRecord } from "../Db";
import { EmbedBuilder } from "discord.js";
import { BOT_NAME, VERSION } from "../Config";
import Utils from "../Utils";
import { YtDlp } from "./youtube/YtDlp";

export default class EmbedCreator {
  private static readonly color = 0xc71585;

  private static formatThousands(num: number): string {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1_000) {
      return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
  }

  public static createNowPlayingEmbed(videoData: VideoDataRecord): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(this.color)
      .setTitle(videoData.title)
      .setURL(videoData.url ?? null)
      .setAuthor({
        name: videoData.authorName ?? "Unknown",
        ...(videoData.authorUrl ? { url: videoData.authorUrl } : {}),
      })
      .setThumbnail(videoData.image ?? null)
      .addFields(
        {
          name: "Duration",
          value: videoData.timestamp || "Unknown",
          inline: true,
        },
        {
          name: "Views",
          value: videoData.views !== null ? this.formatThousands(videoData.views) : "Unknown",
          inline: true,
        },
        {
          name: "Uploaded",
          value: videoData.uploadDate || "Unknown",
          inline: true,
        },
      )
      .setFooter({ text: "Enjoy!" });
  }

  public static createQueueEmbed(queue: readonly VideoDataRecord[]): EmbedBuilder {
    const queueList = queue
      .map((videoData, index) => {
        return `**${index + 1}.** [${videoData.title}](${videoData.url}) - ${
          videoData.timestamp ?? "Unknown duration"
        }`;
      })
      .join("\n");

    return new EmbedBuilder()
      .setColor(this.color)
      .setTitle("Current Queue")
      .setDescription(queueList || "The queue is empty!")
      .setFooter({ text: `Total songs: ${queue.length}` });
  }

  public static createAboutEmbed(uptimeMs: number): EmbedBuilder {
    const gitHubUrl = "https://github.com/NicheDevs/Sabrina";
    const authors = ["Michał Miłek", "Artur Gulik"];
    const year = 2025;
    const uptime = Utils.formatDuration(uptimeMs);

    return new EmbedBuilder()
      .setColor(this.color)
      .setTitle(`About ${BOT_NAME}`)
      .setDescription(
        `${BOT_NAME} is a Discord music bot that plays audio from YouTube links or search terms.\n\n` +
          `**Authors:** ${authors.join(", ")}\n` +
          `**Source Code:** [GitHub](${gitHubUrl})\n` +
          `**Version:** ${VERSION}\n` +
          `**Uptime:** ${uptime}\n\n` +
          `**yt-dlp version:** ${YtDlp.getVersion()}\n` +
          `NicheDevs ${year}`,
      )
      .setFooter({
        text: `Thank you for using ${BOT_NAME}! Report bugs on GitHub.`,
      });
  }
}
