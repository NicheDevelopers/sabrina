import { VoiceState } from "discord.js";
import { log } from "../logging.ts";
import { Message } from "npm:discord.js@14.22.1";

interface UserStateChange {
    id: string;
    username: string;
    kind: UserStateChangeKind;
    channelId: string;
    channelName: string;
    timestamp: Date;
}

enum UserStateChangeKind {
    JOINED = "joined",
    MOVED = "moved",
    MUTED = "self-muted",
    STREAMING_STARTED = "started streaming",
    DEAFENED = "self-deafened",
}

function detectUserStateChangeKind(
    oldState: VoiceState,
    newState: VoiceState,
): UserStateChangeKind | null {
    if (!oldState.channelId && newState.channelId) {
        return UserStateChangeKind.JOINED;
    } else if (
        !oldState.selfMute && newState.selfMute
    ) {
        return UserStateChangeKind.MUTED;
    } else if (
        oldState.channelId && newState.channelId &&
        oldState.channelId !== newState.channelId
    ) {
        return UserStateChangeKind.MOVED;
    } else if (!oldState.streaming && newState.streaming) {
        return UserStateChangeKind.STREAMING_STARTED;
    } else if (!oldState.selfDeaf && newState.selfDeaf) {
        return UserStateChangeKind.DEAFENED;
    }
    return null;
}

export function handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
) {
    try {
        if (oldState.member?.user.bot) return;

        const stateChangeKind = detectUserStateChangeKind(oldState, newState);
        if (!stateChangeKind) {
            return;
        }

        const userId = newState.member?.user.id || oldState.member?.user.id;

        const username = newState.member?.user.username || oldState.member?.user.username;

        const channelName = newState.channel?.name || oldState.channel?.name;

        const channelId = newState.channelId || oldState.channelId;

        if (!userId || !username || !channelId || !channelName) {
            log.warn(
                `Missing data in voice state update, cannot log user state change.: userId=${userId}, username=${username}, channelId=${channelId}, channelName=${channelName}`,
            );
            return;
        }

        const userStateChange: UserStateChange = {
            id: userId,
            username,
            kind: stateChangeKind,
            channelId: channelId,
            channelName: channelName,
            timestamp: new Date(),
        };

        log.info(
            `[VoiceStateChange] ${userStateChange.username} (${userStateChange.id}) ${userStateChange.kind} ${userStateChange.channelName} (${userStateChange.channelId}) at ${userStateChange.timestamp.toISOString()}`,
        );
    } catch (error) {
        log.error("Error handling voice state update:", error);
    }
}

export function handleMessageCreate(message: Message) {
    try {
        if (message.author.bot) return;
        const author = message.author.username;
        const channel = message.channelId;
        log.info(`${author} sent a message in ${channel}`);
        // when database will be implemented, author and channel will be used to store message count
    } catch (error) {
        log.error("Error handling message create:", error);
    }
}
