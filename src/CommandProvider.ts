import NicheBotCommand from "./NicheBotCommand.ts";
import joinCommand from "./music/commands/join.ts";
import leaveCommand from "./music/commands/leave.ts";
import cacheCommand from "./music/commands/cache.ts";

class CommandProviderClass {
  private commands: Array<NicheBotCommand> = [
    joinCommand,
    leaveCommand,
    cacheCommand
  ];

  public getCommand(name: string): NicheBotCommand | undefined {
    return this.commands.find((cmd) => cmd.data.name === name);
  }

  public getAllCommands(): Array<NicheBotCommand> {
    return this.commands;
  }
}

const CommandProvider = new CommandProviderClass();
export default CommandProvider;
