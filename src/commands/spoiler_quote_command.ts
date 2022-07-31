import { CommandBuilder, CommandProvider, isGuildMemberAdmin, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction, CommandInteraction, GuildMember, SlashCommandBuilder, SlashCommandIntegerOption } from "discord.js";

import { Store } from "../support/store.js";

export class SpoilerQuoteCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("SpoilerQuoteCommand");
  }

  provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('spoilerquote')
        .setDescription('Spoiler/unspoiler the text of a quote')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName('sq')
        .setDescription('Spoiler/unspoiler the text of a quote')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        )
    ];
  }

  public provideHelpMessage(): string {
    return "/spoilerquote <id> - Spoiler/unspoiler the text of a quote";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    // Ensure the calling user is an admin
    if (!isGuildMemberAdmin(<GuildMember> interaction.member)) {
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