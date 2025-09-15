import { log } from "../../logging.ts";

const ytDlpPath = "yt-dlp";

function isYtDlpInstalled(): boolean {
  const command = new Deno.Command(
    ytDlpPath,
    {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    },
  );
  const { code } = command.outputSync();
  return code === 0;
}

export class YtDlp {
  public static init() {
    !isYtDlpInstalled()
      ? log.error("yt-dlp is not installed.")
      : log.info("yt-dlp is installed.");
  }

  public static async downloadAudio(
    url: string,
    outputDir: string,
  ): Promise<string | null> {
    const outputTemplate =
      `${outputDir}/%(title)s - %(uploader)s [%(id)s].%(ext)s`;
    const command = new Deno.Command(ytDlpPath, {
      args: ["-x", "--audio-format", "mp3", "-o", outputTemplate, url],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await command.output();
    if (code !== 0) {
      log.error(
        `yt-dlp failed with code ${code}: ${new TextDecoder().decode(stderr)}`,
      );
      return null;
    }

    const output = new TextDecoder().decode(stdout);
    const downloadMatch = output.match(/^\[ExtractAudio\] Destination: (.+)$/m);
    const alreadyDownloadedMatch = output.match(
      /^\[download\] (.+) has already been downloaded$/m,
    );

    if (downloadMatch) {
      const path = downloadMatch[1].trim();
      log.info(`Downloaded audio to ${path}`);
      return path;
    }

    if (alreadyDownloadedMatch) {
      const path = alreadyDownloadedMatch[1].trim();
      log.info(`File has already been downloaded - ${path}`);
      return path;
    }

    log.error("Could not find downloaded file path in yt-dlp output.");
    return null;
  }
}
