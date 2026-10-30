import { EMPTY_CHANNEL_LEAVE_DELAY_MS, GuildState } from "./GuildState";

jest.mock("@discordjs/voice", () => ({
    createAudioPlayer: () => ({ on: jest.fn(), stop: jest.fn() }),
    NoSubscriberBehavior: { Pause: "pause" },
}));

describe("GuildState scheduled leave", () => {
    let guildState: GuildState;
    let onLeave: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        guildState = new GuildState("guild", async () => {});
        onLeave = jest.fn();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("leaves only after the full delay", () => {
        guildState.scheduleLeave(onLeave);

        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS - 1);
        expect(onLeave).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(onLeave).toHaveBeenCalledTimes(1);
    });

    it("does not restart the delay when scheduled again", () => {
        guildState.scheduleLeave(onLeave);
        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS - 1);
        guildState.scheduleLeave(onLeave);

        jest.advanceTimersByTime(1);
        expect(onLeave).toHaveBeenCalledTimes(1);
    });

    it("does not leave when cancelled", () => {
        guildState.scheduleLeave(onLeave);
        guildState.cancelScheduledLeave();

        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
        expect(onLeave).not.toHaveBeenCalled();
    });

    it("can be scheduled again after firing", () => {
        guildState.scheduleLeave(onLeave);
        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);

        guildState.scheduleLeave(onLeave);
        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
        expect(onLeave).toHaveBeenCalledTimes(2);
    });

    it("does not leave after being destroyed", () => {
        guildState.scheduleLeave(onLeave);
        guildState.destroy();

        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
        expect(onLeave).not.toHaveBeenCalled();
    });
});
