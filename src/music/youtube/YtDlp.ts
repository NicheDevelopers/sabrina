import {log} from "../../logging";
import {spawn, spawnSync} from "child_process";

const ytDlpPath = "yt-dlp";

function isYtDlpInstalled(): boolean {
    try {
        const result = spawnSync(ytDlpPath, ["--version"], {
            stdio: "ignore",
        });
        return result.status === 0;
    } catch (error) {
        return false;
    }
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
        const outputTemplate = `${outputDir}/%(title)s - %(uploader)s [%(id)s].%(ext)s`;

        return new Promise((resolve, reject) => {
            const process = spawn(ytDlpPath, ["-x", "-o", outputTemplate, url]);

            let stdout = "";
            let stderr = "";

            process.stdout.on("data", (data) => {
                stdout += data.toString();
            });

            process.stderr.on("data", (data) => {
                stderr += data.toString();
            });

            process.on("close", (code) => {
                if (code !== 0) {
                    log.error(`yt-dlp failed with code ${code}: ${stderr}`);
                    resolve(null);
                    return;
                }

                const downloadMatch = stdout.match(
                    /^\[ExtractAudio\] Destination: (.+)$/m,
                );
                const alreadyDownloadedMatch = stdout.match(
                    /^\[download\] (.+) has already been downloaded$/m,
                );

                if (downloadMatch) {
                    const path = downloadMatch[1]?.trim();
                    log.info(`Downloaded audio to ${path}`);
                    resolve(path);
                    return;
                }

                if (alreadyDownloadedMatch) {
                    const path = alreadyDownloadedMatch[1].trim();
                    log.info(`File has already been downloaded - ${path}`);
                    resolve(path);
                    return;
                }

                log.error("Could not find downloaded file path in yt-dlp output.");
                resolve(null);
            });

            process.on("error", (error) => {
                log.error(`yt-dlp process error: ${error}`);
                resolve(null);
            });
        });
    }
}
