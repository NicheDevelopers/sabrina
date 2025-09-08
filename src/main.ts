import { log } from "./logging.ts";
import NicheBot from "./NicheBot.ts";

function main() {
  log.info("Starting NicheBot...");
  NicheBot.start()
    .catch((err) => {
      log.error("An error occurred while starting NicheBot.");
      log.error(err);
    });
}

main();
