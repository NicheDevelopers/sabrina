import { log } from "./logging.ts";
import NicheBot, { BOT_NAME } from "./NicheBot.ts";
import { YtDlp } from "./music/youtube/YtDlp.ts";
import Db from "./db.ts";
import { audioFileRepository } from "./music/AudioFileRepository.ts";

function main() {
  log.info(`Starting ${BOT_NAME}...`);
  YtDlp.init();
  audioFileRepository.init();
  NicheBot.start().catch((err) => {
    log.error(`An error occurred: ${err}`);
    log.error(err);
  });
}

main();
