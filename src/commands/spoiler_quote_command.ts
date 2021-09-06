import { CommandProvider, isAdmin, Logger, LogLevel, ModernApplicationCommandJSONBody, sendCmdReply } from "bot-framework";
import { SlashCommandBuilder, SlashCommandIntegerOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { Store } from "../support/store.js";

export class SpoilerQuoteCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("SpoilerQuoteCommand");
  }

  provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('spoilerquote')
        .setDescription('Spoiler/unspoiler the text of a quote')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        ).toJSON(),
      new SlashCommandBuilder()
        .setName('sq')
        .setDescription('Spoiler/unspoiler the text of a quote')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/spoilerquote <id> - Spoiler/unspoiler the text of a quote";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    // Ensure the calling user is an admin
    if (! await isAdmin(interaction.guild, interaction.user)) {
      sendCmdReply(interaction, 'Error: not admin', this.logger, LogLevel.DEBUG);
      return;
    }

    // Get arguments from interaction
    const guild = interaction.guild;
    const quoteId = interaction.options.getInteger('id', true);

    // Get quote from Store
    const quote = await Store.getQuoteBySeq(guild.id, quoteId);
    if (quote == null) {
      sendCmdReply(interaction, `Error: invalid quote ID`, this.logger, LogLevel.TRACE);
      return;
    }

    if (quote.message.startsWith('||') && quote.message.endsWith('||')) {
      // Remove '||' from start and end of message
      quote.message = quote.message.substring(2, quote.message.length - 2);
      await quote.save();
      sendCmdReply(interaction, `Unspoilered quote ${quote.seq}`, this.logger, LogLevel.INFO);
    } else {
      quote.message = `||${quote.message}||`;
      await quote.save();
      sendCmdReply(interaction, `Spoilered quote ${quote.seq}`, this.logger, LogLevel.INFO);
    }
  }

}