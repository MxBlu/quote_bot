import { CommandProvider, isAdmin, Logger, LogLevel, ModernApplicationCommandJSONBody, sendCmdReply } from "bot-framework";
import { SlashCommandBuilder, SlashCommandIntegerOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { Store } from "../support/store.js";

export class DelQuoteCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("DelQuoteCommand");
  }

  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('delquote')
        .setDescription('Delete a quote by given id')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        ).toJSON(),
      new SlashCommandBuilder()
        .setName('dq')
        .setDescription('Delete a quote by given id')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/delquote <id> - Delete a quote by given id";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guild.id;
    const quoteId = interaction.options.getInteger('id', true);

    // Get quote from Store
    const quote = await Store.getQuoteBySeq(guildId, quoteId);
    if (quote == null) {
      sendCmdReply(interaction, `Error: invalid quote ID`, this.logger, LogLevel.TRACE);
      return;
    }

    // Ensure the calling user is an admin or the author of said quote
    if (! (await isAdmin(interaction.guild, interaction.user) || quote.quoter == interaction.user.id)) {
      sendCmdReply(interaction, 'Error: not an administrator or author of quote', this.logger, LogLevel.DEBUG);
      return;
    }

    // Attempt to delete quote with given id
    const res = await Store.delQuote(guildId, quoteId);
    if (res.deletedCount != null && res.deletedCount > 0) {
      sendCmdReply(interaction, `Quote ${quoteId} deleted.`, this.logger, LogLevel.INFO);
      return;
    } else {
      // Shouldn't get here... if the store returned the quote, the database should contain it (and delete it)
      sendCmdReply(interaction, `Quote already delted`, this.logger, LogLevel.TRACE);
      this.logger.error(`Quote deleted before expected: ${guildId} ${quoteId}`)
      return;
    }
  }

}