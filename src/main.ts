import { log } from "./logging";
import NicheBot, { BOT_NAME } from "./NicheBot";
import { YtDlp } from "./music/youtube/YtDlp";
import { audioFileRepository } from "./music/AudioFileRepository";
import { startHealthServer } from "./HealthServer";
import { sabrinaDb } from "./Db";

async function main() {
    try {
        log.info(`Starting ${BOT_NAME}...`);

        // Initialize core components
        YtDlp.init();
        audioFileRepository.init();
        await sabrinaDb.init();

        // Start health server first - if this fails, we don't want to start the bot
        log.info("Starting health server...");
        startHealthServer();

        await NicheBot.start();
    } catch (error) {
        log.error(`Failed to start ${BOT_NAME}: ${error}`);
        log.error(error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
    log.info("Received SIGINT, shutting down gracefully...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    log.info("Received SIGTERM, shutting down gracefully...");
    process.exit(0);
});

main();
