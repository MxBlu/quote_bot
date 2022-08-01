import { CommandBuilder, CommandProvider, Interactable, isGuildMemberAdmin, Logger } from "bot-framework";
import { ApplicationCommandType, ButtonInteraction, ContextMenuCommandBuilder, ContextMenuCommandInteraction, GuildMember, InteractionReplyOptions, Message, MessageOptions } from "discord.js";

import { getBestGuildMember } from "../models/UserLite.js";
import { generateEmbed } from "../support/quote_utils.js";

class QuoteDeleteProps {
  quoter: GuildMember;
}

export class QuoteCommand implements CommandProvider<ContextMenuCommandInteraction> {
  logger: Logger;
  
  constructor() {
    this.logger = new Logger("QuoteCommand");
  }

  public provideCommands(): CommandBuilder[] {
    return [
      new ContextMenuCommandBuilder()
        .setName("Quote")
        .setType(ApplicationCommandType.Message)
    ];
  }

  public provideHelpMessage(): string {
    return "Add a #️⃣ react to a message to quote the message";
  }

  public async handle(interaction: ContextMenuCommandInteraction): Promise<void> {
    // Just make sure we have a message here
    if (interaction.commandType != ApplicationCommandType.Message) {
      throw new Error("Unexpected USER interaction");
    }

    // Fetch interaction arguments
    const message = await interaction.channel.messages.fetch(interaction.targetId);
    const quoter = interaction.member as GuildMember;

    // Generate the quoted message
    const messageOptions = await this.doQuoteAction(message, quoter);

    // Generate an Interactable and it's action row to allow deletion
    const interactable = this.generateInteractable(quoter);
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
    const interactable = this.generateInteractable(quoter);
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
  private async doQuoteAction(message: Message, quoter: GuildMember): Promise<InteractionReplyOptions & MessageOptions> {
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
  private generateInteractable(quoter: GuildMember): Interactable<QuoteDeleteProps> {
    const interactable = new Interactable<QuoteDeleteProps>();
    interactable.props = { quoter: quoter };
    interactable.registerHandler(this.deleteHandler, { emoji: "❌" });
    return interactable;
  }

  private deleteHandler = async (interactable: Interactable<QuoteDeleteProps>, 
      interaction: ButtonInteraction) => {
        // Check permissions
        // Only the quoter or an admin can delete a quote
        if (interaction.member.user.id != interactable.props.quoter.id &&
            !isGuildMemberAdmin(<GuildMember> interaction.member)) {
          this.logger.warn(`Unauthorised attempt at quote deletion by ${interaction.member.user.username}`);
          interaction.reply({
            content: "Quote deletion only permitted to the quoter",
            ephemeral: true
          });
          return;
        }

        // Delete the message the interaction is on
        await interactable.message.delete();
        this.logger.debug(`${interaction.user.username} deleted quoted message`);
  }
}