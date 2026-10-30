import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vite-plus/test";
import { EMPTY_CHANNEL_LEAVE_DELAY_MS, GuildPlayer } from "./GuildPlayer";

vi.mock("@discordjs/voice", () => ({
  createAudioPlayer: () => ({ on: vi.fn(), stop: vi.fn() }),
  getVoiceConnection: vi.fn(),
  NoSubscriberBehavior: { Pause: "pause" },
}));

describe("GuildPlayer scheduled leave", () => {
  let guildPlayer: GuildPlayer;
  let onLeave: Mock;

  beforeEach(() => {
    vi.useFakeTimers();
    guildPlayer = new GuildPlayer("guild", async () => null);
    onLeave = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("leaves only after the full delay", () => {
    guildPlayer.scheduleLeave(onLeave);

    vi.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS - 1);
    expect(onLeave).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("does not restart the delay when scheduled again", () => {
    guildPlayer.scheduleLeave(onLeave);
    vi.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS - 1);
    guildPlayer.scheduleLeave(onLeave);

    vi.advanceTimersByTime(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("does not leave when cancelled", () => {
    guildPlayer.scheduleLeave(onLeave);
    guildPlayer.cancelScheduledLeave();

    vi.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it("can be scheduled again after firing", () => {
    guildPlayer.scheduleLeave(onLeave);
    vi.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);

    guildPlayer.scheduleLeave(onLeave);
    vi.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
    expect(onLeave).toHaveBeenCalledTimes(2);
  });

  it("does not leave after being destroyed", () => {
    guildPlayer.scheduleLeave(onLeave);
    guildPlayer.destroy();

    vi.advanceTimersByTime(EMPTY_CHANNEL_LEAVE_DELAY_MS);
    expect(onLeave).not.toHaveBeenCalled();
  });
});
