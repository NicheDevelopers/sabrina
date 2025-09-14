import { log } from "../logging";
import * as fs from "fs";

export default class AudioFileRepository {
  public static readonly audioFolderPath = "./audio-files";

  public static init() {
    try {
      fs.statSync(this.audioFolderPath);
      log.info("Audio repository folder exists.");
    } catch (_e) {
      log.warn("Audio repository folder does not exist. Creating...");
      fs.mkdirSync(this.audioFolderPath);
      log.info("Audio repository folder created.");
    }
  }
}
