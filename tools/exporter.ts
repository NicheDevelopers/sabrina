// Zip the audio-files directory and export the database to a file, into one zip
import { createLogger, format } from "npm:winston@3.17.0";

const log = createLogger({
    level: "info",
    format: format.combine(
        format.colorize(),
    ),
});

async function exportDb() {
    log.info("Exporting database...");
    const audioDir = "./audio-files";
    const dbFile = "./sabrina.db";
    const outputZip = "./nichebot_export.zip";
    const command = new Deno.Command(
        "zip",
        {
            args: ["-r", outputZip, audioDir, dbFile],
            stdout: "piped",
            stderr: "piped",
        },
    );
    const { code, stdout, stderr } = await command.output();
    if (code !== 0) {
        log.error(
            `zip command failed with code ${code}: ${new TextDecoder().decode(stderr)}`,
        );
        return;
    }
    log.info(new TextDecoder().decode(stdout));
}

await exportDb();
