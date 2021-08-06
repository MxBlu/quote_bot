import { BotCommand, CommandProvider, findGuildMember, isAdmin, Logger, LogLevel, sendCmdMessage } from "bot-framework";
import { GuildMember } from "discord.js";

import { QuoteDoc } from "../models/Quote.js";
import { Store } from "../support/store.js";

export class ReattrQuoteCommand implements CommandProvider {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("ReattrQuoteCommand");
  }
  
  public provideAliases(): string[] {
    return [ "reattrquote", "rq" ];
  }

  public provideHelpMessage(): string {
    return "!reattrquote <id> <user> - Reattribute a quote to a given user";
  }

  public async handle(command: BotCommand): Promise<void> {
    if (! await isAdmin(command.message)) {
      sendCmdMessage(command.message, 'Error: not admin', this.logger, LogLevel.DEBUG);
      return;
    }

    const guild = command.message.guild;
    let newAuthor: GuildMember = null;
    let quote: QuoteDoc = null;

    switch (command.arguments.length) {
    case 2:
      // Reattribute a quote to a given user
      // Admin only
      try {
        const quoteId = Number(command.arguments[0]);
        
        // Get the user to reattribute to
        newAuthor = await findGuildMember(command.arguments[1], guild);

        if (newAuthor == null) {
          sendCmdMessage(command.message, `Error: user does not exist`, this.logger, LogLevel.TRACE);
          return;
        }

        quote = await Store.getQuoteBySeq(guild.id, quoteId);
        if (quote == null) {
          sendCmdMessage(command.message, `Error: invalid quote ID`, this.logger, LogLevel.TRACE);
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

    // Update the author field and save to db
    quote.author = newAuthor.id;
    await quote.save();
    sendCmdMessage(command.message, `Reattributed quote to ${newAuthor.displayName}`, this.logger, LogLevel.INFO);
  }

}