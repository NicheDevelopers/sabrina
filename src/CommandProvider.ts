import NicheBotCommand from "./NicheBotCommand.ts";
import joinCommand from "./commands/join.ts";

class CommandProviderClass {
  private commands: Array<NicheBotCommand> = [
    joinCommand,
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
