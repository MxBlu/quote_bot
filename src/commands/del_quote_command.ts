import { CommandProvider, GeneralSlashCommandBuilder, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { SlashCommandBuilder, SlashCommandIntegerOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { Store } from "../support/store.js";

export class DelQuoteCommand implements CommandProvider {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("DelQuoteCommand");
  }

  public provideSlashCommands(): GeneralSlashCommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('delquote')
        .setDescription('Delete a quote by given id')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName('dq')
        .setDescription('Delete a quote by given id')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        )
    ];
  }

  public provideHelpMessage(): string {
    return "/delquote <id> - Delete a quote by given id";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    const guildId = interaction.guild.id;
    const quoteId = interaction.options.getInteger('id', true);

    // Attempt to delete quote with given id
    const res = await Store.delQuote(guildId, quoteId).exec();
    if (res.deletedCount != null && res.deletedCount > 0) {
      sendCmdReply(interaction, `Quote ${quoteId} deleted.`, this.logger, LogLevel.INFO);
      return;
    } else {
      sendCmdReply(interaction, `Error: quote ${quoteId} doesn't exist`, this.logger, LogLevel.TRACE);
      return;
    }
  }

}