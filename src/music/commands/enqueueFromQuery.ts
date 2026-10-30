import { logPlays } from "../../analytics/analytics";
import type { VideoDataRecord } from "../../Db";
import { log } from "../../logging";
import NicheBot from "../../NicheBot";
import type { CommandContext } from "../../NicheBotCommand";
import * as Utils from "../../Utils";
import * as QueryParser from "../QueryParser";
import SongQueue from "../SongQueue";
import { youTube } from "../youtube/YouTube";

export async function enqueueFromQuery(
  ctx: CommandContext,
  addToQueue: (queue: SongQueue<VideoDataRecord>, videos: VideoDataRecord[]) => void,
) {
  const guildPlayer = NicheBot.getGuildPlayer(ctx.guildId);
  if (!guildPlayer.isConnected()) {
    await guildPlayer.join(ctx.channel!);
  }

  const input = ctx.interaction.options.getString("query", true);
  const { videos, errors } = await youTube.handleQuery(QueryParser.parse(input));

  if (videos.length > 0) {
    addToQueue(guildPlayer.songQueue, videos);
  }

  await ctx.interaction.followUp(Utils.queueResultMessage(input, videos, errors.length));

  for (const video of videos) {
    log.info(
      `[${ctx.interaction.commandName}] Added video ${video.title} (${video.id}) to queue in guild ${ctx.guildId}`,
    );
  }
  logPlays(videos, ctx.interaction);
}
