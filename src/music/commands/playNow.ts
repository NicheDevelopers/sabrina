import { SlashCommandBuilder } from "discord.js";
import NicheBotCommand, { type CommandContext } from "../../NicheBotCommand";
import { enqueueFromQuery } from "./enqueueFromQuery";

const data = new SlashCommandBuilder()
  .setName("playnow")
  .setDescription("Play a song immediately")
  .addStringOption((option) =>
    option.setName("query").setDescription("The song to play").setRequired(true),
  )
  .addBooleanOption((option) =>
    option.setName("skip").setDescription("Skip the current song").setRequired(false),
  );

async function execute(ctx: CommandContext) {
  await enqueueFromQuery(ctx, (queue, videos) => {
    // With nothing to skip, the new song starts on its own
    const shouldSkip = ctx.interaction.options.getBoolean("skip") && !queue.isEmpty();

    queue.addSongsNext(videos);
    if (shouldSkip) {
      queue.skipSongs(1);
    }
  });
}

const playNowCommand = new NicheBotCommand(data, execute, { userInVoice: true });
export default playNowCommand;
