import { log } from "./logging.ts";
import NicheBot, {BOT_NAME} from "./NicheBot.ts";
import { checkYtDlp } from "./music/youtube/ytdlp.ts";
import {initDb} from "./db.ts";

async function main() {
  log.info(`Starting ${BOT_NAME}...`);
  await checkYtDlp();
  initDb();
  NicheBot.start()
    .catch((err) => {
      log.error(`An error occurred while starting ${BOT_NAME}.`);
      log.error(err);
    });
}

await main();
