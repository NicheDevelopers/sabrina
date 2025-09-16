import {
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel,
} from "npm:discord.js@14.22.1";

export default class Utils {
  /* Returns the voice channel of the member who initiated the interaction. */
  public static getVoiceChannelFromInteraction(
    interaction: ChatInputCommandInteraction,
  ): VoiceChannel | null {
    const member = interaction.member as GuildMember;
    return member.voice.channel as VoiceChannel | null;
  }

  public static reply(interaction: ChatInputCommandInteraction, message: string) {
    if (interaction.replied || interaction.deferred) {
      return interaction.editReply(message);
    } else {
      return interaction.reply(message);
    }
  }
}
