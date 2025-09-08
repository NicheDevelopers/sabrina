import { BOT_CONFIG, Bot, init } from "./init.ts";
import { log } from "./log.ts";

function main() {
  log.info("Starting NicheBot...");
  init()
    .then(() => {
      log.info("Initialized NicheBot. Logging in...");
      Bot.login(BOT_CONFIG.token);
    })
    .catch((err) => {
      log.error("An error occurred while starting NicheBot.");
      log.error(err);
    });
}

main();
