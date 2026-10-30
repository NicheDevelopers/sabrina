import {
  BaseInteraction,
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
  Guild,
  REST,
  Routes,
  VoiceChannel,
} from "discord.js";
import { log } from "./logging";
import CommandProvider from "./CommandProvider";
import { sabrinaDb } from "./Db";
import { GuildPlayersManager } from "./GuildPlayersManager";
import Utils from "./Utils";
import { CommandContext } from "./NicheBotCommand";
import { handleMessageCreate, handleVoiceStateUpdate } from "./analytics/analytics";
import { APPLICATION_ID, SECRET_TOKEN } from "./Config";

class NicheBotClass {
  private readonly guildPlayersManager: GuildPlayersManager;

  private readonly token: string = SECRET_TOKEN;
  private readonly appId: string = APPLICATION_ID;

  private readonly client: Client = this.makeClient();

  private isShuttingDown: boolean = false;

  private readonly startupTimestamp: number = Date.now();

  constructor() {
    this.guildPlayersManager = new GuildPlayersManager((channelId) =>
      this.client.channels.fetch(channelId),
    );

    this.validateConfig();

    // Node signal handlers are already in main
    this.client.on(Events.Error, (error) => {
      log.error("Discord client error:", error);
    });
    this.client.on("interactionCreate", (interaction) => {
      this.onInteractionCreate(interaction).catch((error: unknown) => {
        log.error("Failed to handle interaction:", error);
      });
    });
    this.client.on("messageCreate", handleMessageCreate);
    this.client.on("voiceStateUpdate", handleVoiceStateUpdate);
    this.client.on("voiceStateUpdate", (_oldState, newState) =>
      this.updateScheduledLeave(newState.guild),
    );
  }

  public async start() {
    await this.refreshCommands();
    this.client.once(Events.ClientReady, (c) => {
      log.info(`Ready! Logged in as ${c.user.tag}`);
    });
    await this.client.login(this.token);
  }

  /*
   * Register slash commands with Discord API, so that the members can see them.
   */
  private async refreshCommands() {
    const commandData = CommandProvider.getAllCommands().map((c) => c.data.toJSON());
    log.info(`Registering ${commandData.length} commands...`);
    const rest = new REST({ version: "10" }).setToken(this.token);

    const postCommands = rest.put(Routes.applicationCommands(this.appId), {
      body: commandData,
    });

    log.info("Refreshing application (/) commands.");
    await postCommands;
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
    if (!interaction.guildId) {
      log.warn("Command invoked outside of a guild");
      await interaction.reply("This command can only be used in a server!");
      return;
    }

    try {
      await interaction.deferReply();
    } catch (error) {
      log.error("Failed to defer interaction reply:", error);
      return;
    }

    const command = CommandProvider.getCommand(interaction.commandName);
    if (!command) {
      log.error(`No command matching ${interaction.commandName} was found.`);
      await interaction.followUp({
        content: "Command not found.",
        ephemeral: true,
      });
      return;
    }

    let channel: VoiceChannel | null = null;
    if (command.requiresUserInVoice) {
      channel = Utils.getVoiceChannelFromInteraction(interaction);
      if (!channel) {
        log.warn(
          `[${command.data.name}] Failed to obtain user voice channel (guild ${interaction.guildId})`,
        );
        await interaction.followUp("Cannot get the channel you're in!");
        return;
      }
    }

    log.info(
      `COMMAND ${command.data.name} by ${interaction.user.tag} in guild ${interaction.guildId}`,
    );

    // Update the last interaction channel for this guild
    const guildPlayer = this.guildPlayersManager.getGuildPlayer(interaction.guildId);
    guildPlayer.setLastInteractionChannel(interaction.channelId);

    log.debug(
      `Set last interaction channel for guild ${interaction.guildId} to: ${interaction.channelId}`,
    );

    if (command.requiresBotInVoice && !guildPlayer.isConnected()) {
      log.warn(
        `[${command.data.name}] Command invoked but bot is not in a voice channel (guild ${interaction.guildId})`,
      );
      await interaction.followUp("I'm not in a voice channel!");
      return;
    }

    try {
      const ctx: CommandContext = {
        interaction,
        channel,
        guildId: interaction.guildId,
      };
      await command.execute(ctx);
    } catch (error) {
      log.error(`Error executing command ${command.data.name}`, error);
      await interaction.followUp({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  }

  /* Gracefully shut down the bot.
   * Cleans up resources and disconnects from Discord.
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    log.warn("Shutting down...");

    try {
      // Clean up all guild players
      this.guildPlayersManager.destroyAll();

      await this.client.destroy();
      await sabrinaDb.close();

      log.warn("Bot shut down.");
      process.exit(0);
    } catch (error) {
      log.error("Failed to shut down cleanly:", error);
      process.exit(1);
    }
  }

  private updateScheduledLeave(guild: Guild): void {
    if (!this.guildPlayersManager.hasGuildPlayer(guild.id)) {
      return;
    }

    const guildPlayer = this.guildPlayersManager.getGuildPlayer(guild.id);
    const channel = guild.members.me?.voice.channel;

    if (channel && channel.members.every((member) => member.user.bot)) {
      guildPlayer.scheduleLeave(() => {
        log.info(`Leaving empty voice channel in guild ${guild.id}.`);
        guildPlayer.disconnect();
      });
    } else {
      guildPlayer.cancelScheduledLeave();
    }
  }

  /*
   * Load configuration from environment variables.
   * Throws an error if any required variable is missing.
   */
  private validateConfig(): void {
    const missing: string[] = [];
    if (this.token === "") missing.push("SECRET_TOKEN");
    if (this.appId === "") missing.push("APPLICATION_ID");

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }
  }

  private makeClient(): Client {
    return new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
      ],
    });
  }

  // Public methods for commands to access guild-specific functionality
  public getGuildPlayer(guildId: string) {
    return this.guildPlayersManager.getGuildPlayer(guildId);
  }

  public getUptime(): number {
    return Date.now() - this.startupTimestamp;
  }
}

const NicheBot = new NicheBotClass();

export default NicheBot;
