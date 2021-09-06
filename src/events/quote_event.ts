import { Logger } from "bot-framework";
import { MessageReaction, GuildMember } from "discord.js";

import { QuoteSaveCommand } from "../context_commands/quotesave_command.js";
import { QuoteCommand } from "../context_commands/quote_command.js";

export class QuoteEventHandler {

  quoteCommand: QuoteCommand;
  quoteSaveCommand: QuoteSaveCommand;

  logger: Logger;

  constructor() {
    this.quoteCommand = new QuoteCommand();
    this.quoteSaveCommand = new QuoteSaveCommand();
    this.logger = new Logger("QuoteEventHandler");
  }

  public messageReactionHandler = async (reaction: MessageReaction, user: GuildMember): Promise<void> => {
    // Make sure we get a full message instead of a partial
    const message = await reaction.message.fetch();

    // Handle emojis we care about
    // Remove reaction if we're handling em
    switch (reaction.emoji.name) {
    case "#️⃣":
      // Quote on hash react
      this.quoteCommand.legacyHandle(message, user);
      reaction.remove();
      break;
    case "omegachair":
    case "♿":
      // Save on wheelchair react
      this.quoteSaveCommand.legacyHandle(message, user);
      reaction.remove();
      break;
    }
  }
}