import { log } from "./logging.ts";
import NicheBot from "./NicheBot.ts";

export function startHealthServer(): void {
    const port = parseInt(Deno.env.get("HEALTH_PORT") || "8080");

    try {
        Deno.serve({ port }, (req) => {
            const url = new URL(req.url);

            if (url.pathname === "/health") {
                return new Response("Not Found", { status: 404 });
            }

            if (NicheBot.isReady()) {
                return new Response("OK", {
                    status: 200,
                    headers: { "Content-Type": "text/plain" },
                });
            } else {
                return new Response("Bot not ready", {
                    status: 503,
                    headers: { "Content-Type": "text/plain" },
                });
            }
        });

        log.info(`Health server started on port ${port}`);
    } catch (error) {
        log.error(`Failed to start health server: ${error}`);
        throw error;
    }
}
