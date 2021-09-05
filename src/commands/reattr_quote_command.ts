import { CommandProvider, GeneralSlashCommandBuilder, isAdmin, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

import { Store } from "../support/store.js";

export class ReattrQuoteCommand implements CommandProvider {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("ReattrQuoteCommand");
  }
  
  public provideSlashCommands(): GeneralSlashCommandBuilder[] {
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

  public async handle(interaction: CommandInteraction): Promise<void> {
    // Ensure the calling user is an admin
    if (! await isAdmin(interaction.guild, interaction.user)) {
      sendCmdReply(interaction, 'Error: not admin', this.logger, LogLevel.DEBUG);
      return;
    }

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

    // Update the author field and save to db
    quote.author = newAuthor.id;
    await quote.save();

    sendCmdReply(interaction, `Reattributed quote to ${newAuthor.username}`, this.logger, LogLevel.INFO);
  }

}