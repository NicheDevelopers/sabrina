import {
    ChatInputCommandInteraction,
    Message,
    MessageType,
    VoiceState,
} from "discord.js";
import { log } from "../logging";
import { sabrinaDb } from "../Db";
import { MessageLogRecord, VideoDataRecord } from "../Db";
import { randomUUID } from "node:crypto";

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

/* Failing to record a play should never fail the command that started it */
export async function logPlays(
    videos: readonly VideoDataRecord[],
    interaction: ChatInputCommandInteraction
): Promise<void> {
    await Promise.all(
        videos.map(async video => {
            try {
                await sabrinaDb.insertPlayLog(video.id, interaction);
            } catch (error) {
                log.error(`Failed to log play of video ${video.id}:`, error);
            }
        })
    );
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
            `[VoiceStateChange] ${userStateChange.username} (${userStateChange.userId}) ${userStateChange.kind} ${userStateChange.channelName} (${userStateChange.channelId}) at ${userStateChange.timestamp.toISOString()}`
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

/**
 * Maps Discord.js MessageType enum to a human-readable string for analytics.
 */
function getMessageTypeName(type: MessageType): string {
    switch (type) {
        case MessageType.Default:
            return "default";
        case MessageType.Reply:
            return "reply";
        case MessageType.ChatInputCommand:
            return "slash_command";
        case MessageType.ContextMenuCommand:
            return "context_menu";
        case MessageType.ThreadStarterMessage:
            return "thread_starter";
        case MessageType.GuildBoost:
            return "boost";
        case MessageType.UserJoin:
            return "user_join";
        default:
            return `other_${type}`;
    }
}

export function handleMessageCreate(message: Message) {
    try {
        if (message.author.bot) {
            return;
        }

        if (!message.guildId || !message.guild) {
            return;
        }

        const channel = message.channel;
        const channelName = "name" in channel && channel.name ? channel.name : "unknown";

        const record: MessageLogRecord = {
            id: randomUUID(),
            userId: message.author.id,
            userName: message.author.username,
            channelId: message.channelId,
            channelName: channelName,
            guildId: message.guildId,
            guildName: message.guild.name,
            contentLength: message.content?.length ?? 0,
            attachmentCount: message.attachments.size,
            hasEmbed: message.embeds.length > 0,
            isReply: message.reference !== null,
            repliedToUserId: message.reference?.messageId
                ? (message.mentions.repliedUser?.id ?? null)
                : null,
            messageType: getMessageTypeName(message.type),
            timestamp: new Date().toISOString(),
        };

        log.info(
            `[Message] ${record.userName} in #${record.channelName} (${record.guildName}) - ${record.contentLength} chars`
        );

        sabrinaDb
            .insertMessageLog(record)
            .then(() => {
                log.debug("Message logged to database.");
            })
            .catch((err: unknown) => {
                log.error("Failed to log message to database:", err);
            });
    } catch (error) {
        log.error("Error handling message create:", error);
    }
}
