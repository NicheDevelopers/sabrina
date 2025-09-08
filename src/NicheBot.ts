import { VoiceConnection, AudioPlayer, createAudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";

class NicheBotClass {
  voiceConnection: VoiceConnection | null = null;
  audioPlayer: AudioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });
}

let NicheBot = new NicheBotClass();

export default NicheBot;
