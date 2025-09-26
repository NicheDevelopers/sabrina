import NicheBotCommand from "./NicheBotCommand";
import joinCommand from "./music/commands/join";
import leaveCommand from "./music/commands/leave";
import cacheCommand from "./music/commands/cache";
import playCommand from "./music/commands/play";
import pauseCommand from "./music/commands/pause";
import resumeCommand from "./music/commands/resume";
import queueCommand from "./music/commands/queue";
import skipCommand from "./music/commands/skip";
import aboutCommand from "./music/commands/about";
import playNowCommand from "./music/commands/playNow";
import dumpLogsCommand from "./music/commands/dumpLogs";
import shuffleCommand from "./music/commands/shuffle";
import loopCommand from "./music/commands/loop";

class CommandProviderClass {
    private commands: Array<NicheBotCommand> = [
        joinCommand,
        leaveCommand,
        cacheCommand,
        playCommand,
        pauseCommand,
        resumeCommand,
        queueCommand,
        skipCommand,
        aboutCommand,
        playNowCommand,
        dumpLogsCommand,
        shuffleCommand,
        loopCommand,
    ];

    public getCommand(name: string): NicheBotCommand | undefined {
        return this.commands.find(cmd => cmd.data.name === name);
    }

    public getAllCommands(): Array<NicheBotCommand> {
        return this.commands;
    }
}

const CommandProvider = new CommandProviderClass();
export default CommandProvider;
