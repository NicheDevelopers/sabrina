import { log } from "./logging";
import NicheBot, {BOT_NAME} from "./NicheBot";
import AudioFileRepository from "./music/AudioFileRepository";
import {YtDlp} from "./music/youtube/YtDlp";
import Db from "./db";

function main() {
  log.info(`Starting ${BOT_NAME}...`);
  YtDlp.init();
  Db.init();
  AudioFileRepository.init();
  NicheBot.start().catch((err) => {
    log.error(`An error occurred: ${err}`);
    log.error(err);
  })
}

main();