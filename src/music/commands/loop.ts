import { LoopType } from "../SongQueue";
import { SlashCommandBuilder } from "discord.js";
import NicheBot from "../../NicheBot";
import NicheBotCommand, { CommandContext } from "../../NicheBotCommand";

const data = new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Loops the current queue or song")
    .addStringOption(option =>
        option
            .addChoices(
                { name: "queue", value: "all" },
                { name: "song", value: "one" },
                { name: "disabled", value: "disabled" }
            )
            .setName("looptype")
            .setDescription("The type of the loop")
            .setRequired(false)
    );

function loopMessage(loopType: LoopType) {
    switch (loopType) {
        case "all":
            return "Looping the queue";
        case "one":
            return "Looping the current song";
        case "disabled":
            return "Looping disabled";
        default:
            return "Invalid loop type!";
    }
}

async function execute(ctx: CommandContext) {
    const loopTypeString = ctx.interaction.options.getString("looptype") ?? "all";

    if (
        loopTypeString !== "all" &&
        loopTypeString !== "one" &&
        loopTypeString !== "disabled"
    ) {
        await ctx.interaction.followUp(
            "Invalid loop type! Valid types are: all, one, disabled."
        );
        return;
    }
    const loopType = loopTypeString as LoopType;

    if (!NicheBot.getCurrentVoiceConnection(ctx.guildId)) {
        await ctx.interaction.followUp("I'm not in a voice channel!");
        return;
    }

    const guildState = NicheBot.getGuildState(ctx.guildId);
    guildState.songQueue.setLoopType(loopType);

    await ctx.interaction.followUp(loopMessage(loopType));
}

const loopCommand = new NicheBotCommand(data, execute, true);
export default loopCommand;
