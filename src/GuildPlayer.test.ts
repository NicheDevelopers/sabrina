import { EMPTY_CHANNEL_LEAVE_DELAY_MS, GuildPlayer } from "./GuildPlayer";

jest.mock("@discordjs/voice", () => ({
    createAudioPlayer: () => ({ on: jest.fn(), stop: jest.fn() }),
    getVoiceConnection: jest.fn(),
    NoSubscriberBehavior: { Pause: "pause" },
}));

describe("GuildPlayer scheduled leave", () => {
    let guildPlayer: GuildPlayer;
    let onLeave: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        guildPlayer = new GuildPlayer("guild", async () => null);
        onLeave = jest.fn();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("leaves only after the full delay", () => {
        guildPlayer.scheduleLeave(onLeave);

        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS - 1);
        expect(onLeave).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1);
        expect(onLeave).toHaveBeenCalledTimes(1);
    });

    it("does not restart the delay when scheduled again", () => {
        guildPlayer.scheduleLeave(onLeave);
        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS - 1);
        guildPlayer.scheduleLeave(onLeave);

        jest.advanceTimersByTime(1);
        expect(onLeave).toHaveBeenCalledTimes(1);
    });

    it("does not leave when cancelled", () => {
        guildPlayer.scheduleLeave(onLeave);
        guildPlayer.cancelScheduledLeave();

        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
        expect(onLeave).not.toHaveBeenCalled();
    });

    it("can be scheduled again after firing", () => {
        guildPlayer.scheduleLeave(onLeave);
        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);

        guildPlayer.scheduleLeave(onLeave);
        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
        expect(onLeave).toHaveBeenCalledTimes(2);
    });

    it("does not leave after being destroyed", () => {
        guildPlayer.scheduleLeave(onLeave);
        guildPlayer.destroy();

        jest.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
        expect(onLeave).not.toHaveBeenCalled();
    });
});
