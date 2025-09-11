import { log } from "../logging.ts";

export default class AudioFileRepository {
  private static readonly audioFolderPath = "./audio-files";
  public static init() {
    try {
      Deno.statSync(this.audioFolderPath);
      log.info("Audio repository folder exists.");
    } catch (_e) {
      log.warn("Audio repository folder does not exist. Creating...");
      Deno.mkdirSync(this.audioFolderPath)
      log.info("Audio repository folder created.");
    }
  }

  public static makeFileName(title: string, author: string, extension: string): string {
    const uuid = crypto.randomUUID();
    return `${author} - ${title} [${uuid}].${extension}`;
  }
}
