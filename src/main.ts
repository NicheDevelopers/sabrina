import { log } from "./logging.ts";
import NicheBot, { BOT_NAME } from "./NicheBot.ts";
import { YtDlp } from "./music/youtube/YtDlp.ts";
import { audioFileRepository } from "./music/AudioFileRepository.ts";
import { startHealthServer } from "./HealthServer.ts";

async function main() {
    try {
        log.info(`Starting ${BOT_NAME}...`);

        // Initialize core components
        YtDlp.init();
        audioFileRepository.init();

        // Start health server first - if this fails, we don't want to start the bot
        log.info("Starting health server...");
        startHealthServer();

        // Only start the bot after health server is confirmed working
        log.info("Starting Discord bot...");
        await NicheBot.start();

        log.info(`${BOT_NAME} started successfully!`);
    } catch (error) {
        log.error(`Failed to start ${BOT_NAME}: ${error}`);
        log.error(error);
        Deno.exit(1);
    }
}

main();
