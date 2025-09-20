import {
    ChatInputCommandInteraction,
    GuildMember,
    VoiceChannel,
} from "npm:discord.js@14.22.1";

const version = Deno.readTextFileSync("VERSION").trim();

export default class Utils {
    /* Returns the voice channel of the member who initiated the interaction. */
    public static getVoiceChannelFromInteraction(
        interaction: ChatInputCommandInteraction,
    ): VoiceChannel | null {
        const member = interaction.member as GuildMember;
        return member.voice.channel as VoiceChannel | null;
    }

    public static getVersion(): string {
        return version;
    }
}
