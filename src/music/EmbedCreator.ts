import {VideoDataRecord} from "../Db";
import {EmbedBuilder} from "discord.js";
import NicheBot, {BOT_NAME} from "../NicheBot";
import Utils from "../Utils";

export default class EmbedCreator {
    private static color = 0xc71585;

    public static createNowPlayingEmbed(videoData: VideoDataRecord): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(this.color)
            .setTitle(videoData.title)
            .setURL(videoData.url ?? null)
            .setAuthor({
                name: videoData.authorName ?? "Unknown",
                url: videoData.authorUrl ?? "Unknown",
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
                }
            )
            .setFooter({text: "Enjoy!"});
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
            .setFooter({text: `Total songs: ${queue.length}`});
    }

    public static createAboutEmbed(): EmbedBuilder {
        const gitHubUrl = "https://github.com/NicheDevs/Sabrina";
        const issuesUrl = "https://github.com/NicheDevelopers/sabrina/issues";
        const authors = ["Michał Miłek", "Artur Gulik"];
        const year = 2025;
        const version = Utils.getVersion();
        const uptime = Utils.formatDuration(NicheBot.getUptime());

        return new EmbedBuilder()
            .setColor(this.color)
            .setTitle(`About ${BOT_NAME}`)
            .setDescription(
                `${BOT_NAME} is a Discord music bot that plays audio from YouTube links or search terms.\n\n` +
                `**Authors:** ${authors.join(", ")}\n` +
                `**Source Code:** [GitHub](${gitHubUrl})\n` +
                `**Version:** ${version}\n` +
                `**Uptime:** ${uptime}\n\n` +
                `NicheDevs ${year}`
            )
            .setFooter({text: `Thank you for using ${BOT_NAME}! Report bugs on GitHub.`});
    }
}
