import { CommandBuilder, CommandProvider, Logger, sendMessage } from "bot-framework";
import { ApplicationCommandType, ContextMenuCommandBuilder, ContextMenuCommandInteraction, GuildMember, InteractionReplyOptions, Message, MessageOptions } from "discord.js";

import { getBestGuildMember } from "../models/UserLite.js";
import { generateEmbed } from "../support/quote_utils.js";
import { Store } from "../support/store.js";

export class QuoteSaveCommand implements CommandProvider<ContextMenuCommandInteraction> {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("QuoteSaveCommand");
  }

  public provideCommands(): CommandBuilder[] {
    return [
      new ContextMenuCommandBuilder()
        .setName("Save Quote")
        .setType(ApplicationCommandType.Message)
    ];
  }

  public provideHelpMessage(): string {
    return "Add a ♿ or :omegaChair: emote to save a quote";
  }

  public async handle(interaction: ContextMenuCommandInteraction): Promise<void> {
    // Just make sure we have a message here
    if (interaction.commandType != ApplicationCommandType.Message) {
      throw new Error("Unexpected USER interaction");
    }

    // Fetch interaction arguments
    const message = await interaction.channel.messages.fetch(interaction.targetId);
    const quoter = interaction.member as GuildMember;

    // Make sure the quote doesn't exist first
    if (await Store.checkQuoteExists(message.url)) {
      this.logger.trace(`${quoter.user.username} - ${message.guild.name} - Error: Quote already exists`);
      interaction.reply({ content: "Error: Quote already exists" });
      return;
    }

    // Generate and send quoted message
    const messageOptions = await this.doQuoteAction(message, quoter);
    interaction.reply(messageOptions);
  }

  // Handle legacy (emoji react based) events
  public async legacyHandle(message: Message, quoter: GuildMember): Promise<void> {
    // Make sure the quote doesn't exist first
    if (await Store.checkQuoteExists(message.url)) {
      this.logger.trace(`${quoter.user.username} - ${message.guild.name} - Error: Quote already exists`);
      sendMessage(message.channel, "Error: Quote already exists");
      return;
    }
    
    const messageOptions = await this.doQuoteAction(message, quoter);
    message.channel.send(messageOptions);
  }

  // Generate message with quote contents
  private async doQuoteAction(message: Message, quoter: GuildMember): Promise<InteractionReplyOptions & MessageOptions> {
    // Get best guild member we can for the author
    const author = await getBestGuildMember(message.guild, message.author);

    // Create message to send
    const embed = generateEmbed(message, author);

    // Store quoted message to db
    const quote = await Store.addQuote(message.guild.id, message.channel.id, author.id, quoter.id,
      embed.data.description, embed.data.image?.url, message.url, message.createdAt);

    this.logger.info(`${quoter.user.username} saved quote ${message.url}`);
    
    // Send message with embed
    const messagePreamble = `${quote.seq}: **${quoter.displayName}** saved a quote by **${author.displayName}**:`;
    return { content: messagePreamble, embeds: [ embed ] };
  }
}