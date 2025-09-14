import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from "../../logging";

const execAsync = promisify(exec);

function isYtDlpInstalled(): Promise<boolean> {
  return execAsync('yt-dlp --version')
    .then(() => true)
    .catch(() => false);
}

export class YtDlp {
  public static async init() {
    const installed = await isYtDlpInstalled();
    installed ? log.info("yt-dlp is installed.") : log.error("yt-dlp is not installed.");
  }

  public static async downloadAudio(url: string, outputDir: string): Promise<string | null> {
    const outputTemplate = `${outputDir}/%(title)s - %(uploader)s [%(id)s].%(ext)s`;

    try {
      const { stdout, stderr } = await execAsync(
        `yt-dlp -x --audio-format mp3 -o "${outputTemplate}" "${url}"`
      );

      const downloadMatch = stdout.match(/^\[ExtractAudio\] Destination: (.+)$/m);
      const alreadyDownloadedMatch = stdout.match(/^\[download\] (.+) has already been downloaded$/m);

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
    } catch (error: any) {
      log.error(`Error executing yt-dlp: ${error.message}`);
      if (error.stderr) log.error(`stderr: ${error.stderr}`);
      return null;
    }
  }
}