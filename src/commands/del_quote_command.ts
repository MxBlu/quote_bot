import { BotCommand, CommandProvider, Logger, LogLevel, sendCmdMessage } from "bot-framework";

import { Store } from "../support/store.js";

export class DelQuoteCommand implements CommandProvider {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("DelQuoteCommand");
  }
  
  public provideAliases(): string[] {
    return [ "delquote", "dq" ];
  }

  public provideHelpMessage(): string {
    return "!delquote <id> - Delete a quote by given id";
  }

  public async handle(command: BotCommand): Promise<void> {
    const guildId = command.message.guild.id;
    switch (command.arguments.length) {
    case 1:
      // Delete quote with given seq ID
      try {
        // Attempt to delete quote with given id
        const res = await Store.delQuote(guildId, 
            Number(command.arguments[0])).exec();
        if (res.deletedCount != null && res.deletedCount > 0) {
          sendCmdMessage(command.message, `Quote ${command.arguments[0]} deleted.`, this.logger, LogLevel.INFO);
          return;
        } else {
          sendCmdMessage(command.message, `Error: quote ${command.arguments[0]} doesn't exist`, this.logger, LogLevel.TRACE);
          return;
        }
      } catch (e) {
        sendCmdMessage(command.message, 'Error: invalid argument', this.logger, LogLevel.TRACE);
        return;
      }
      break;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.TRACE);
      return;
    }
  }

}