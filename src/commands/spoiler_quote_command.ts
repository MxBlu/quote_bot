import { BotCommand, CommandProvider, Logger, LogLevel, sendCmdMessage } from "bot-framework";

import { QuoteDoc } from "../models/Quote.js";
import { Store } from "../support/store.js";

export class SpoilerQuoteCommand implements CommandProvider {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("SpoilerQuoteCommand");
  }
  
  public provideAliases(): string[] {
    return [ "spoilerquote", "sq" ];
  }

  public provideHelpMessage(): string {
    return "!spoilerquote <id> - Spoiler/unspoiler the text of a quote";
  }

  public async handle(command: BotCommand): Promise<void> {
    const guild = command.message.guild;
    let quote: QuoteDoc = null;

    switch (command.arguments.length) {
    case 1:
      // Spoiler/Unspoiler a quote
      try {
        const quoteId = Number(command.arguments[0]);
        
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

    if (quote.message.startsWith('||') && quote.message.endsWith('||')) {
      // Remove '||' from start and end of message
      quote.message = quote.message.substring(2, quote.message.length - 2);
      await quote.save();
      sendCmdMessage(command.message, `Unspoilered quote ${quote.seq}`, this.logger, LogLevel.INFO);
    } else {
      quote.message = `||${quote.message}||`;
      await quote.save();
      sendCmdMessage(command.message, `Spoilered quote ${quote.seq}`, this.logger, LogLevel.INFO);
    }
  }

}