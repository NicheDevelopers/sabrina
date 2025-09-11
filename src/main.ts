import { log } from "./logging.ts";
import NicheBot from "./NicheBot.ts";
import { checkYtDlp } from "./music/youtube/ytdlp.ts";

async function main() {
  log.info("Starting NicheBot...");
  await checkYtDlp();
  NicheBot.start()
    .catch((err) => {
      log.error("An error occurred while starting NicheBot.");
      log.error(err);
    });
}

await main();
