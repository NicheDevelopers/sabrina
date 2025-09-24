import { log } from "./logging";
import * as http from "http";
import NicheBot from "./NicheBot";

export function startHealthServer(): void {
    const port = parseInt(process.env["HEALTH_PORT"] || "8080");
    try {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url || "", `http://localhost:${port}`);

            if (url.pathname === "/health") {
                if (NicheBot.isReady()) {
                    res.writeHead(200, { "Content-Type": "text/plain" });
                    res.end("OK");
                } else {
                    res.writeHead(503, { "Content-Type": "text/plain" });
                    res.end("Bot not ready");
                }
                return;
            }

            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        });

        server.listen(port, () => {
            log.info(`Health server started on port ${port}`);
        });

        server.on("error", error => {
            log.error(`Failed to start health server: ${error.message}`);
            throw error;
        });
    } catch (error) {
        log.error(`Failed to start health server: ${error}`);
        throw error;
    }
}
