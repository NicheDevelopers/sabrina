import { VideoDataRecord } from "../db.ts";
import { EmbedBuilder } from "npm:discord.js@14.22.1";

export default class EmbedCreator {
  public static createNowPlayingEmbed(
    videoData: VideoDataRecord,
  ): EmbedBuilder {
    return new EmbedBuilder()
      .setColor(0xc71585)
      .setTitle(videoData.title)
      .setURL(videoData.url ?? null)
      .setAuthor({
        name: videoData.authorName ?? "Unknown",
        url: videoData.authorUrl ?? undefined,
      })
      .setThumbnail(videoData.image ?? null)
      .addFields(
        {
          name: "Duration",
          value: videoData.timestamp ? `${videoData.timestamp}` : "Unknown",
          inline: true,
        },
        {
          name: "Views",
          value: videoData.views ? videoData.views.toString() : "Unknown",
          inline: true,
        },
        {
          name: "Uploaded",
          value: videoData.uploadDate ?? "Unknown",
          inline: true,
        },
      )
      .setFooter({ text: "Enjoy!" });
  }
}
