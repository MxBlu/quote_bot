import { CommandBuilder, CommandProvider, isGuildMemberAdmin, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { ChatInputCommandInteraction, CommandInteraction, GuildMember, SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandUserOption } from "discord.js";

import { Store } from "../support/store.js";

export class ReattrQuoteCommand implements CommandProvider<CommandInteraction> {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("ReattrQuoteCommand");
  }
  
  public provideCommands(): CommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('reattrquote')
        .setDescription('Reattribute a quote to a given user')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('New author')
            .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName('rq')
        .setDescription('Reattribute a quote to a given user')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
            .setRequired(true)
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('New author')
            .setRequired(true)
        )
    ];
  }

  public provideHelpMessage(): string {
    return "/reattrquote <id> <user> - Reattribute a quote to a given user";
  }

  public async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    // Get arguments from interaction
    const guild = interaction.guild;
    const quoteId = interaction.options.getInteger('id', true);
    const newAuthor = interaction.options.getUser('user', true);

    // Get quote from Store
    const quote = await Store.getQuoteBySeq(guild.id, quoteId);
    if (quote == null) {
      sendCmdReply(interaction, `Error: invalid quote ID`, this.logger, LogLevel.TRACE);
      return;
    }

    // Ensure the calling user is an admin or the author of said quote
    if (! (isGuildMemberAdmin(<GuildMember> interaction.member) || quote.quoter == interaction.user.id)) {
      sendCmdReply(interaction, 'Error: not an administrator or author of quote', this.logger, LogLevel.DEBUG);
      return;
    }

    // Update the author field and save to db
    quote.author = newAuthor.id;
    await quote.save();

    sendCmdReply(interaction, `Reattributed quote to ${newAuthor.username}`, this.logger, LogLevel.INFO);
  }

}