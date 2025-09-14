import NicheBotCommand from "./NicheBotCommand";
import joinCommand from "./music/commands/join";
import leaveCommand from "./music/commands/leave";
import cacheCommand from "./music/commands/cache";

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
