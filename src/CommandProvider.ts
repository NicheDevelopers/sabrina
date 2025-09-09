import NicheBotCommand from "./NicheBotCommand.ts";
import joinCommand from "./commands/join.ts";
import leaveCommand from "./commands/leave.ts";

class CommandProviderClass {
  private commands: Array<NicheBotCommand> = [
    joinCommand,
    leaveCommand
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
