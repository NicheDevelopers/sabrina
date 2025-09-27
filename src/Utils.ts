import { ChatInputCommandInteraction, GuildMember, VoiceChannel } from "discord.js";
import * as fs from "node:fs";

export default class Utils {
    /* Returns the voice channel of the member who initiated the interaction. */
    public static getVoiceChannelFromInteraction(
        interaction: ChatInputCommandInteraction
    ): VoiceChannel | null {
        const member = interaction.member as GuildMember;
        return member.voice.channel as VoiceChannel;
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
