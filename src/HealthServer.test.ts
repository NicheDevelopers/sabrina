import * as http from "node:http";
import { AddressInfo } from "node:net";
import { startHealthServer } from "./HealthServer";
import NicheBot from "./NicheBot";

jest.mock("./Config", () => ({
    ...jest.requireActual("./Config"),
    HEALTH_PORT: 0,
}));

jest.mock("./NicheBot", () => ({
    __esModule: true,
    default: { isReady: jest.fn() },
}));

describe("HealthServer", () => {
    let server: http.Server;

    beforeEach(async () => {
        server = startHealthServer();
        await new Promise(resolve => server.once("listening", resolve));
    });

    afterEach(async () => {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    });

    function statusOf(path: string): Promise<number | undefined> {
        const { port } = server.address() as AddressInfo;
        return new Promise((resolve, reject) => {
            http.get({ port, path, agent: false }, res => {
                res.resume();
                resolve(res.statusCode);
            }).on("error", reject);
        });
    }

    it("reports healthy when the bot is ready", async () => {
        jest.mocked(NicheBot.isReady).mockReturnValue(true);
        expect(await statusOf("/health")).toBe(200);
    });

    it("ignores the query string", async () => {
        jest.mocked(NicheBot.isReady).mockReturnValue(true);
        expect(await statusOf("/health?probe=1")).toBe(200);
    });

    it("reports unavailable when the bot is not ready", async () => {
        jest.mocked(NicheBot.isReady).mockReturnValue(false);
        expect(await statusOf("/health")).toBe(503);
    });

    it("returns 404 for unknown paths", async () => {
        expect(await statusOf("/unknown")).toBe(404);
    });

    it("returns 404 for a path that is not a valid URL", async () => {
        expect(await statusOf("//")).toBe(404);
    });
});
