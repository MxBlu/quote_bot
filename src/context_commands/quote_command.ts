import { ApplicationCommandType, CommandProvider, Interactable, Logger, ModernApplicationCommandJSONBody } from "bot-framework";
import { ButtonInteraction, ContextMenuInteraction, GuildMember, Message, MessageOptions } from "discord.js";

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

    // Generate the quoted message
    const messageOptions = await this.doQuoteAction(message, quoter);

    // Generate an Interactable and it's action row to allow deletion
    const interactable = this.generateInteractable();
    const actionRow = interactable.getActionRow();

    // Send the reply with the action row included and fetch the resulting message
    const quoteMessage = await interaction.reply({
      ...messageOptions,
      components: [ actionRow ],
      fetchReply: true
    });

    // Activate the Interactable
    interactable.activate(quoteMessage as Message);
  }

  // Handle legacy (emoji react based) events
  public async legacyHandle(message: Message, quoter: GuildMember): Promise<void> {
    // Generate the quoted message
    const messageOptions = await this.doQuoteAction(message, quoter);

    // Generate an Interactable and it's action row to allow deletion
    const interactable = this.generateInteractable();
    const actionRow = interactable.getActionRow();

    // Add the action row to the message and send it
    const quoteMessage = await message.channel.send({
      ...messageOptions,
      components: [ actionRow ]
    });

    // Activate the Interactable
    interactable.activate(quoteMessage);
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

  // Generate an Interactable to allow user deletion of quotes
  private generateInteractable(): Interactable<void> {
    const interactable = new Interactable<void>();
    interactable.registerHandler(this.deleteHandler, { emoji: "❌" });
    return interactable;
  }

  private deleteHandler = async (interactable: Interactable<void>, 
      interaction: ButtonInteraction) => {
        // Delete the message the interaction is on
        await interactable.message.delete();
        this.logger.debug(`${interaction.user.username} deleted quoted message`);
  }
}