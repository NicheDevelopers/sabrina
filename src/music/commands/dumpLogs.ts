import {AttachmentBuilder, SlashCommandBuilder} from "discord.js";
import NicheBotCommand, {CommandContext} from "../../NicheBotCommand";
import * as fs from "node:fs";
import {log} from "../../logging";

const data = new SlashCommandBuilder()
    .setName("dumplogs")
    .setDescription("Dump the bot logs to a file");

async function execute(ctx: CommandContext) {
    const logFilePath = process.env["LOG_FILE"] || "./logs/sabrina.log";

    try {
        log.debug(`Attempting to read log file at: ${logFilePath}`);
        // Check if log file exists
        if (!fs.existsSync(logFilePath)) {
            await ctx.interaction.followUp("Log file not found.");
            return;
        }

        const stats = fs.statSync(logFilePath);
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes

        let content: Buffer;

        if (stats.size > maxSize) {
            // Read only the last 5MB of the file
            const fd = fs.openSync(logFilePath, 'r');
            const buffer = Buffer.alloc(maxSize);
            fs.readSync(fd, buffer, 0, maxSize, stats.size - maxSize);
            fs.closeSync(fd);
            content = buffer;

            await ctx.interaction.followUp({
                content: `Log file is larger than 5MB. Showing last 5MB of logs.`,
                files: [new AttachmentBuilder(content, {name: 'bot-logs.txt'})]
            });
        } else {
            // Read entire file
            content = fs.readFileSync(logFilePath);

            await ctx.interaction.followUp({
                content: `Log file dump (${(stats.size / 1024).toFixed(2)} KB)`,
                files: [new AttachmentBuilder(content, {name: 'bot-logs.txt'})]
            });
        }

    } catch (error) {
        console.error("Error reading log file:", error);
        await ctx.interaction.followUp("Failed to read log file: " + (error as Error).message);
    }
}

const dumpLogsCommand = new NicheBotCommand(data, execute, false);
export default dumpLogsCommand;
