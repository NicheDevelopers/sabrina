import { Message, VoiceState } from "discord.js";
import { log } from "../logging";
import { sabrinaDb } from "../Db";

export interface VoiceStateChange {
    id?: string;
    userId: string;
    username: string;
    kind: string; // Changed from VoiceStateChangeKind to string to match database
    channelId: string;
    channelName: string;
    guildId: string;
    guildName: string;
    timestamp: Date;
}

enum VoiceStateChangeKind {
    JOINED = "joined",
    MOVED = "moved",
    MUTED = "self-muted",
    STREAMING_STARTED = "started streaming",
    DEAFENED = "self-deafened",
}

function detectUserStateChangeKind(
    oldState: VoiceState,
    newState: VoiceState
): VoiceStateChangeKind | null {
    if (!oldState.channelId && newState.channelId) {
        return VoiceStateChangeKind.JOINED;
    } else if (!oldState.selfMute && newState.selfMute) {
        return VoiceStateChangeKind.MUTED;
    } else if (
        oldState.channelId &&
        newState.channelId &&
        oldState.channelId !== newState.channelId
    ) {
        return VoiceStateChangeKind.MOVED;
    } else if (!oldState.streaming && newState.streaming) {
        return VoiceStateChangeKind.STREAMING_STARTED;
    } else if (!oldState.selfDeaf && newState.selfDeaf) {
        return VoiceStateChangeKind.DEAFENED;
    }
    return null;
}

export function handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    try {
        if (oldState.member?.user.bot) {
            return;
        }

        const stateChangeKind = detectUserStateChangeKind(oldState, newState);
        if (!stateChangeKind) {
            return;
        }

        const userId = newState.member?.user.id || oldState.member?.user.id;
        const username = newState.member?.user.username || oldState.member?.user.username;
        const guildId = newState.guild.id || oldState.guild.id;
        const guildName = newState.guild.name || oldState.guild.name;
        const channelName = newState.channel?.name || oldState.channel?.name;
        const channelId = newState.channelId || oldState.channelId;

        if (
            !userId ||
            !username ||
            !channelId ||
            !channelName ||
            !guildId ||
            !guildName
        ) {
            log.warn(
                `Missing data in voice state update, cannot log user state change.: userId=${userId}, username=${username}, channelId=${channelId}, channelName=${channelName} guildId=${guildId}, guildName=${guildName}`
            );
            return;
        }

        const userStateChange: VoiceStateChange = {
            userId,
            username,
            kind: stateChangeKind,
            guildId,
            guildName,
            channelId,
            channelName,
            timestamp: new Date(),
        };

        log.info(
            `[VoiceStateChange] ${userStateChange.username} (${userStateChange.id}) ${userStateChange.kind} ${userStateChange.channelName} (${userStateChange.channelId}) at ${userStateChange.timestamp.toISOString()}`
        );
        sabrinaDb
            .insertVoiceStateLog(userStateChange)
            .then(() => {
                log.debug("Voice state change logged to database.");
            })
            .catch((err: unknown) => {
                log.error("Failed to log voice state change to database:", err);
            });
    } catch (error) {
        log.error("Error handling voice state update:", error);
    }
}

export function handleMessageCreate(message: Message) {
    try {
        if (message.author.bot) {
            return;
        }
        const author = message.author.username;
        const channel = message.channelId;
        log.info(`${author} sent a message in ${channel}`);
        // when database will be implemented, author and channel will be used to store message count
    } catch (error) {
        log.error("Error handling message create:", error);
    }
}
