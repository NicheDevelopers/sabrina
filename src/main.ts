import { log } from "./logging.ts";
import NicheBot, {BOT_NAME} from "./NicheBot.ts";
import AudioFileRepository from "./music/AudioFileRepository.ts";
import {YtDlp} from "./music/youtube/YtDlp.ts";
import Db from "./db.ts";

function main() {
  log.info(`Starting ${BOT_NAME}...`);
  YtDlp.init();
  Db.init();
  AudioFileRepository.init();
  NicheBot.start()
    .catch((err) => {
      log.error(`An error occurred while starting ${BOT_NAME}.`);
      log.error(err);
    });
}

main();