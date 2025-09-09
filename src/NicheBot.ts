import {
  AudioPlayer,
  createAudioPlayer,
  NoSubscriberBehavior,
  VoiceConnection,
} from "@discordjs/voice";
import { ChatInputCommandInteraction, REST, Routes } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import { log } from "./logging.ts";
import CommandProvider from "./CommandProvider.ts";
import {
  DiscordGatewayAdapterCreator,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from "npm:@discordjs/voice@0.19.0";
import {BaseInteraction} from "npm:discord.js@14.22.1";

class NicheBotClass {
  private voiceConnection: VoiceConnection | null = null;
  private audioPlayer: AudioPlayer = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  private token: string = Deno.env.get("SECRET_TOKEN") || "";
  private serverId: string = Deno.env.get("SERVER_ID") || "";
  private appId: string = Deno.env.get("APPLICATION_ID") || "";

  private client: Client = this.makeClient();

  private isShuttingDown: boolean = false;

  constructor() {
    this.validateConfig();
    Deno.addSignalListener("SIGINT", () => {
      this.shutdown();
    });
  }

  public async start() {
    await this.client.login(this.token);
    await this.refreshCommands();
    this.client.on("clientReady", this.onClientReady);
    this.client.on("interactionCreate", this.onInteractionCreate);
    log.info("NicheBot started. Logged in as " + this.client.user?.tag);
  }

  /*
   * Register slash commands with Discord API, so that the members can see them.
   */
  private async refreshCommands() {
    const commandData = CommandProvider.getAllCommands().map((c) =>
      c.data.toJSON()
    );
    console.log(commandData);
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

  private async onClientReady() {
    log.info(`Logged in as ${this.client.user!.tag}!`);
    const guild = this.client.guilds.cache.get(this.serverId);

    await guild?.members.fetch();

    guild?.members.cache.forEach((member) => {
      if (member.user.bot) console.log(`Found bot: ${member.user.username}`);
      else {console.log(
          `Found user: ${member.user.username}, ${member.user.id}, ${member.user.displayAvatarURL()}`,
        );}
    });

    guild?.channels.cache.forEach((channel) => {
      console.log(
        `Found channel: ${channel.name}, ${channel.id}, ${channel.type}`,
      );
    });
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

  public connectTo(channelId: string, guildId: string, adapterCreator: DiscordGatewayAdapterCreator) {
    if (this.voiceConnection) {
      log.warn("Already connected to a voice channel.");
      return;
    }

    this.voiceConnection = joinVoiceChannel({
      channelId: channelId,
      guildId: guildId,
      adapterCreator: adapterCreator,
    });

    this.voiceConnection.on(VoiceConnectionStatus.Ready, () => {
      log.info("Successfully joined voice channel.");
    });

    this.voiceConnection.on(VoiceConnectionStatus.Disconnected, () => {
      log.warn("Disconnected from voice channel.");
      this.voiceConnection = null;
    });

    this.voiceConnection.subscribe(this.audioPlayer);
  }

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
