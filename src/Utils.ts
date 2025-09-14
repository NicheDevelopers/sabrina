import { ChatInputCommandInteraction, GuildMember, VoiceChannel } from "discord.js";

export class Utils {
  /* Returns the voice channel of the member who initiated the interaction. */
  public static getVoiceChannelFromInteraction(interaction: ChatInputCommandInteraction): VoiceChannel | null {
    const member = interaction.member as GuildMember;
    return member.voice.channel as VoiceChannel | null;
  }
}

export class Env {
  public static get(variableName: string): string | undefined {
    return process.env[variableName]
  }
}