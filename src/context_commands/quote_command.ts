import { ApplicationCommandType, CommandProvider, Logger, ModernApplicationCommandJSONBody } from "bot-framework";
import { ContextMenuInteraction, GuildMember, Message, MessageOptions } from "discord.js";

import { getBestGuildMember } from "../models/UserLite.js";
import { generateEmbed } from "../support/quote_utils.js";

export class QuoteCommand implements CommandProvider<ContextMenuInteraction> {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("QuoteCommand");
  }

  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
        {
            name: "Quote",
            description: "",
            type: ApplicationCommandType.MESSAGE
        }
    ];
  }

  public provideHelpMessage(): string {
    return "Add a #️⃣ react to a message to quote the message";
  }

  public async handle(interaction: ContextMenuInteraction): Promise<void> {
    // Just make sure we have a message here
    if (interaction.targetType != "MESSAGE") {
      throw new Error("Unexpected USER interaction");
    }

    // Fetch interaction arguments
    const message = await interaction.channel.messages.fetch(interaction.targetId);
    const quoter = interaction.member as GuildMember;

    // Generate and send quoted message
    const messageOptions = await this.doQuoteAction(message, quoter);
    interaction.reply(messageOptions);
  }

  // Handle legacy (emoji react based) events
  public async legacyHandle(message: Message, quoter: GuildMember): Promise<void> {
    const messageOptions = await this.doQuoteAction(message, quoter);
    message.channel.send(messageOptions);
  }

  // Generate message with quote contents
  private async doQuoteAction(message: Message, quoter: GuildMember): Promise<MessageOptions> {
    // Get best guild member we can for the author
    const author = await getBestGuildMember(message.guild, message.author);

    // Create message to send
    const embed = generateEmbed(message, author);

    this.logger.info(`${quoter.user.username} quoted ${message.url}`);

    // Send message with embed
    const messagePreamble = `**${quoter.displayName}** quoted **${author.displayName}**:`;
    return { content: messagePreamble, embeds: [ embed ] };
  }
}