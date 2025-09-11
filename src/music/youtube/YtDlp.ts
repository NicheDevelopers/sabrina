import { log } from "../../logging.ts"

function isYtDlpInstalled(): boolean {
  const command = new Deno.Command(
    "yt-dlp",
    {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    },
  );
  const {code} = command.outputSync();
  return code === 0;
}

export class YtDlp {
  public static init() {
    !isYtDlpInstalled() ? log.error("yt-dlp is not installed.") : log.info("yt-dlp is installed.");
  }
}



