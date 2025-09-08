import {
  ChatInputCommandInteraction,
  REST,
  Routes,
} from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";

export const BOT_CONFIG = {
  token: Deno.env.get("SECRET_TOKEN"),
  server_id: Deno.env.get("SERVER_ID"),
  client_id: Deno.env.get("APPLICATION_ID")
};

export const Bot = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

let shuttingDown = false;
process.on("SIGINT", async () => {
  if (shuttingDown) return;
  shuttingDown = true;

  log.warn("Shutting down...");

  await Bot.destroy();

  process.exit(0);
});

Bot.on("ready", async () => {
  log.info(`Logged in as ${Bot.user!.tag}!`);
  const guild = Bot.guilds.cache.get(BOT_CONFIG.server_id);
  const res = await guild?.members.fetch();

  guild?.members.cache.forEach(member => {
    if (member.user.bot) console.log(`Found bot: ${member.user.username}`);
    else console.log(`Found user: ${member.user.username}, ${member.user.id}, ${member.user.displayAvatarURL()}`);
  });

  guild?.channels.cache.forEach(channel => {
    console.log(`Found channel: ${channel.name}, ${channel.id}, ${channel.type}`);
  });
});

Bot.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }
  if (!(interaction instanceof ChatInputCommandInteraction)) {
    return;
  }

  const command = commands.find((c) => c.data.name === interaction.commandName);
  if (command) {
    log.info(`COMMAND ${command.data.name} by ${interaction.user.tag}`);
    await command.execute(interaction);
  }
});

// import { handleMessageCreate, handleVoiceStateUpdate } from "../../nichebot/src/stats/handlers.ts";
// Bot.on("messageCreate", handleMessageCreate);
// Bot.on("voiceStateUpdate", handleVoiceStateUpdate);

import {log} from "./log.ts";
import commands from "./commands.ts";

export async function init() {
  console.log(BOT_CONFIG)
  const commandData = commands.map((command) => command.data);
  const rest = new REST({ version: "10" }).setToken(BOT_CONFIG.token);

  const postCommands = rest.put(
    Routes.applicationCommands(BOT_CONFIG.client_id),
    {
      body: commandData,
    },
  );

  log.info("Refreshing application (/) commands.");
  await Promise.all([postCommands]);
  log.info("Refreshed application (/) commands.");
}
