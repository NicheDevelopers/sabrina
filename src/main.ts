import { log } from "./logging.ts";
import NicheBot from "./NicheBot.ts";
import { checkYtDlp } from "./music/youtube/ytdlp.ts";
import {initDb} from "./db.ts";

async function main() {
  log.info("Starting NicheBot...");
  await checkYtDlp();
  initDb();
  NicheBot.start()
    .catch((err) => {
      log.error("An error occurred while starting NicheBot.");
      log.error(err);
    });
}

await main();
