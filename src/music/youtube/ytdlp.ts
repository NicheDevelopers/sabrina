import { log } from "../../logging.ts"

export async function checkYtDlp() {
  !(await isYtDlpInstalled()) ? log.warn("yt-dlp is not installed.") : log.info("yt-dlp is installed.")
}

async function isYtDlpInstalled(): Promise<boolean> {
  const command = new Deno.Command(
    "yt-dlp",
    {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    },
  );
  const {code} = await command.output();
  return code === 0;
}

