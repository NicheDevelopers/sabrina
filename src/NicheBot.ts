import {
  AudioPlayer,
  createAudioPlayer,
  NoSubscriberBehavior,
  VoiceConnection,
} from "npm:@discordjs/voice";
import { ChatInputCommandInteraction, REST, Routes } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import { log } from "./logging.ts";
import CommandProvider from "./CommandProvider.ts";
import {
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from "npm:@discordjs/voice@0.19.0";
import {BaseInteraction, Events, VoiceChannel} from "npm:discord.js@14.22.1";
import SongQueue from "./music/SongQueue.ts";

export const BOT_NAME = Deno.env.get("BOT_NAME") || "NicheBot";

class NicheBotClass {
  public voiceConnection: VoiceConnection | null = null;
  public audioPlayer: AudioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  private songQueue: SongQueue<unknown> = new SongQueue();

  private token: string = Deno.env.get("SECRET_TOKEN") || "";
  private serverId: string = Deno.env.get("SERVER_ID") || "";
  private appId: string = Deno.env.get("APPLICATION_ID") || "";

  private client: Client = this.makeClient();

  private isShuttingDown: boolean = false;

  constructor() {
    this.client.on('debug', console.log)
    this.validateConfig();
    Deno.addSignalListener("SIGINT", () => {
      this.shutdown();
    });
    log.debug(this.client)
  }

  public async start() {
    await this.refreshCommands();
    this.client.once(Events.ClientReady, c => {
      log.info(`Ready! Logged in as ${c.user.tag}`);
    })
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
    this.voiceConnection?.destroy();
    this.client.destroy().then(() => {
      log.warn("Bot shut down.");
      Deno.exit(0)
    })
  }

  public isInVoiceChannel(): boolean {
    return this.voiceConnection !== null;
  }

  /* Connect to a voice channel.
    * Returns a promise that resolves when the connection is ready.
    * Rejects if the connection fails or times out.
   */
  // public connectTo(channel: VoiceChannel): Promise<void> {
  //   log.debug(this.voiceConnection)
  //   if (this.voiceConnection) {
  //     log.warn("Already connected to a voice channel.");
  //     return Promise.resolve();
  //   }
  //
  //   log.debug(this.voiceConnection)
  //
  //   this.voiceConnection = joinVoiceChannel({
  //     channelId: channel.id,
  //     guildId: channel.guildId,
  //     adapterCreator: channel.guild.voiceAdapterCreator,
  //   });
  //
  //   // this.voiceConnection.on(VoiceConnectionStatus.Ready, () => {
  //   //   this.voiceConnection?.subscribe(this.audioPlayer)
  //   //   log.error("DUPA DUPA DUPA")
  //   // });
  //   //
  //   // this.voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
  //   //   this.voiceConnection = null;
  //   //   log.error("CHUJ CHUJ CHUJ")
  //   // });
  //
  //   return new Promise<void>((resolve, reject) => {
  //     const timeout = setTimeout(() => {
  //       reject(new Error("Voice connection timeout"));
  //     }, 15000); // 15 seconds timeout
  //
  //     this.voiceConnection!.on(VoiceConnectionStatus.Ready, () => {
  //       this.voiceConnection?.subscribe(this.audioPlayer);
  //       clearTimeout(timeout); // Clear the timeout
  //       resolve(); // Resolve the promise when ready
  //       log.error("DUPA DUPA DUPA");
  //     });
  //
  //     this.voiceConnection!.on(VoiceConnectionStatus.Disconnected, () => {
  //       this.voiceConnection = null;
  //       clearTimeout(timeout);
  //       reject(new Error("Voice connection disconnected")); // Reject on disconnect
  //       log.error("CHUJ CHUJ CHUJ");
  //     });
  //   });
  // }

  // public connectTo(channel: VoiceChannel): Promise<void> {
  //   if (this.voiceConnection) {
  //     log.warn("Already connected to a voice channel.");
  //     return;
  //   }
  //
  //   try {
  //     log.debug(`Attempting to join voice channel ${channel.id}`);
  //
  //     this.voiceConnection = joinVoiceChannel({
  //       channelId: channel.id,
  //       guildId: channel.guild.id,
  //       adapterCreator: channel.guild.voiceAdapterCreator,
  //     });
  //
  //     // Set up basic event listeners
  //     this.voiceConnection.on(VoiceConnectionStatus.Ready, () => {
  //       log.info("Voice connection is ready.");
  //       this.voiceConnection?.subscribe(this.audioPlayer);
  //     });
  //
  //   } catch (error) {
  //     log.error(`Failed to connect to voice channel: ${error}`);
  //     if (this.voiceConnection) {
  //       this.voiceConnection.destroy();
  //       this.voiceConnection = null;
  //     }
  //     throw error; // Re-throw to let caller handle it
  //   }
  //   return Promise.resolve()
  // }

  // public async connectTo(channel: VoiceChannel): Promise<void> {
  //   // If already connected, just resolve
  //   if (this.voiceConnection) {
  //     log.warn("Already connected to a voice channel.");
  //     return;
  //   }
  //
  //   try {
  //     // Create the connection
  //     this.voiceConnection = joinVoiceChannel({
  //       channelId: channel.id,
  //       guildId: channel.guild.id,
  //       adapterCreator: channel.guild.voiceAdapterCreator,
  //     });
  //
  //     this.voiceConnection.on(VoiceConnectionStatus.Ready , () => {
  //       log.info("Voice connection is ready.");
  //     })
  //
  //     this.voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
  //       log.warn("Voice connection disconnected.");
  //     });
  //
  //     return Promise.resolve();
  //
  //     // Wait for the connection to be ready (with timeout)
  //     await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 15000);
  //
  //     // Subscribe the audio player once connected
  //     this.voiceConnection.subscribe(this.audioPlayer);
  //
  //     log.info("Successfully connected to voice channel");
  //
  //     // Set up disconnect handler for future disconnects
  //     this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
  //       try {
  //         // Try to reconnect
  //         await Promise.race([
  //           entersState(this.voiceConnection!, VoiceConnectionStatus.Ready, 5000),
  //           entersState(this.voiceConnection!, VoiceConnectionStatus.Signalling, 5000)
  //         ]);
  //
  //         log.info("Reconnected to voice channel");
  //       } catch (error) {
  //         // Destroy the connection if reconnection fails
  //         this.voiceConnection?.destroy();
  //         this.voiceConnection = null;
  //         log.error("Voice connection disconnected and couldn't reconnect");
  //       }
  //     });
  //   } catch (error) {
  //     // Clean up if connection failed
  //     if (this.voiceConnection) {
  //       this.voiceConnection.destroy();
  //       this.voiceConnection = null;
  //     }
  //     log.error(`Failed to connect to voice channel: ${error}`);
  //     throw error; // Re-throw to let caller handle it
  //   }
  // }

  /* Disconnect from the current voice channel.
    * Cleans up the voice connection and resets state.
   */
  public disconnect() {
    if (!this.voiceConnection) {
      log.warn("Not connected to a voice channel.");
      return;
    }
    this.voiceConnection.destroy();
    this.voiceConnection = null;
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
}

const NicheBot = new NicheBotClass();

export default NicheBot;
