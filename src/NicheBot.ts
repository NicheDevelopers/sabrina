import {
  AudioPlayer,
  createAudioPlayer,
  NoSubscriberBehavior,
  VoiceConnection,
} from "npm:@discordjs/voice";
import {
  ChatInputCommandInteraction,
  REST,
  Routes,
  TextChannel,
} from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import { log } from "./logging.ts";
import CommandProvider from "./CommandProvider.ts";
import {
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from "npm:@discordjs/voice@0.19.0";
import { BaseInteraction, Events, VoiceChannel } from "npm:discord.js@14.22.1";
import SongQueue from "./music/SongQueue.ts";
import { VideoDataRecord } from "./db.ts";
import { createAudioResource } from "npm:@discordjs/voice@0.19.0";
import { youTube } from "./music/youtube/YouTube.ts";
import EmbedCreator from "./music/EmbedCreator.ts";

export const BOT_NAME = Deno.env.get("BOT_NAME") || "NicheBot";

let lastInteractionChannelId = "";

class NicheBotClass {
  public audioPlayer: AudioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  public songQueue: SongQueue<VideoDataRecord> = new SongQueue(async (song) => await this.playFromQueue(song));

  private token: string = Deno.env.get("SECRET_TOKEN") || "";
  private serverId: string = Deno.env.get("SERVER_ID") || "";
  private appId: string = Deno.env.get("APPLICATION_ID") || "";

  private client: Client = this.makeClient();

  private isShuttingDown: boolean = false;

  constructor() {
    // this.client.on("debug", console.log);
    this.validateConfig();
    Deno.addSignalListener("SIGINT", () => {
      this.shutdown();
    });
  }

  public async start() {
    await this.refreshCommands();
    this.client.once(Events.ClientReady, (c) => {
      log.info(`Ready! Logged in as ${c.user.tag}`);
    });
    await this.client.login(this.token);
    this.client.on("interactionCreate", this.onInteractionCreate);
  }

  /*
   * Register slash commands with Discord API, so that the members can see them.
   */
  private async refreshCommands() {
    const commandData = CommandProvider.getAllCommands().map((c) =>
      c.data.toJSON()
    );
    log.info(`Registering ${commandData.length} commands...`);
    const rest = new REST({ version: "10" }).setToken(this.token);

    const postCommands = rest.put(
      Routes.applicationCommands(this.appId),
      {
        body: commandData,
      },
    );

    log.info("Refreshing application (/) commands.");
    await Promise.all([postCommands]);
    log.info("Refreshed application (/) commands.");
  }

  /*
   * Handle slash command interactions.
   * This is where the bot responds to commands.
   */
  private async onInteractionCreate(interaction: BaseInteraction) {
    if (!interaction.isCommand()) {
      return;
    }
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return;
    }

    const command = CommandProvider.getCommand(interaction.commandName);
    if (command) {
      log.info(`COMMAND ${command.data.name} by ${interaction.user.tag}`);
      lastInteractionChannelId = interaction.channelId;
      log.debug(`Set last interaction channel ID to: ${lastInteractionChannelId}`);
      await command.execute(interaction);
    }
  }

  /* Gracefully shut down the bot.
    * Cleans up resources and disconnects from Discord.
   */
  private shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    log.warn("Shutting down...");
    this.client.destroy().then(() => {
      log.warn("Bot shut down.");
      Deno.exit(0);
    });
  }

  public getCurrentVoiceConnection(guildId: string): VoiceConnection | null {
    return getVoiceConnection(guildId) ?? null;
  }

  /* Connect to a voice channel.
    * Returns a promise that resolves when the connection is ready.
    * Rejects if the connection fails or times out.
   */
  public joinVoiceChannel(channel: VoiceChannel): Promise<void> {
    const guildId = channel.guildId;
    if (this.getCurrentVoiceConnection(guildId)) {
      log.warn("Already connected to a voice channel.");
      return Promise.resolve();
    }

    const voiceConnection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Voice connection timeout"));
      }, 15000); // 15 seconds timeout

      voiceConnection.on(VoiceConnectionStatus.Ready, () => {
        voiceConnection.subscribe(this.audioPlayer);
        clearTimeout(timeout); // Clear the timeout
        resolve(); // Resolve the promise when ready
        log.info("Voice connection is ready.");
      });

      voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
        clearTimeout(timeout);
        reject(new Error("Voice connection disconnected")); // Reject on disconnect
        log.warn("Voice connection disconnected.");
      });
    });
  }

  /* Disconnect from the current voice channel.
    * Cleans up the voice connection and resets state.
   */
  public disconnectFrom(guildId: string): void {
    this.audioPlayer.stop();
    const voiceConnection = this.getCurrentVoiceConnection(guildId);
    if (!voiceConnection) {
      log.warn("Not connected to a voice channel.");
      return;
    }
    voiceConnection.destroy();
    log.info("Destroyed voice connection.");
  }

  /*
   * Load configuration from environment variables.
   * Throws an error if any required variable is missing.
   */
  private validateConfig(): void {
    const missing: string[] = [];
    if (this.token === "") missing.push("SECRET_TOKEN");
    if (this.serverId === "") missing.push("SERVER_ID");
    if (this.appId === "") missing.push("APPLICATION_ID");

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`,
      );
    }
  }

  private makeClient(): Client {
    return new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });
  }

  public async playFromQueue(videoData: VideoDataRecord): Promise<void> {
    if (!videoData) {
      this.disconnectFrom(lastInteractionChannelId);
      return;
    }

    log.debug(`PLAY FROM QUEUE: Now playing: ${videoData.title}`);

    if (!videoData.path) {
      videoData.path = await youTube.findLocalOrDownload(videoData.id);
    }

    const audioResource = createAudioResource(videoData.path);
    const paused = this.audioPlayer.state.status === "paused";
    this.audioPlayer.play(audioResource);
    if (paused) this.audioPlayer.pause();

    log.debug(`Playing ${JSON.stringify(videoData, null, 2)}`);

    const nowPlaying = EmbedCreator.createNowPlayingEmbed(videoData);
    log.debug(`Getting channel with id: ${lastInteractionChannelId}`);
    const channel = await this.getChannel("919304430074101790");
    await channel.send({ embeds: [nowPlaying] });
  }

  private async getChannel(channelId: string): Promise<TextChannel> {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Channel with ID ${channelId} not found`);
    }
    if (!(channel instanceof TextChannel)) {
      throw new Error(`Channel with ID ${channelId} is not text-based`);
    }
    return channel;
  }
}

const NicheBot = new NicheBotClass();

export default NicheBot;
