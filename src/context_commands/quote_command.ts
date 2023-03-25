import { CommandBuilder, CommandProvider, Interactable, isGuildMemberAdmin, Logger } from "bot-framework";
import { ApplicationCommandType, ButtonInteraction, Collection, ContextMenuCommandBuilder, ContextMenuCommandInteraction, GuildBasedChannel, GuildMember, GuildTextBasedChannel, InteractionReplyOptions, Message, MessageOptions, SelectMenuInteraction } from "discord.js";

import { getBestGuildMember } from "../models/UserLite.js";
import { generateEmbed } from "../support/quote_utils.js";

class QuoteDeleteProps {
  quoter: GuildMember;
}

class SelectChannelProps {
  quoter: GuildMember;
  message: Message;
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

    // Get list of all other channels, which is used for the new interaction handler.
    const textBasedChannels = interaction.guild.channels.cache
      .filter((channels) => channels.isTextBased())
      .first(25);

    const selectMenuInteractable = this.generateSelectMenuInteractable(message, textBasedChannels, quoter);
    const stringActionRow = selectMenuInteractable.getActionRow();

    const channelSelectMessage = await interaction.reply({
      components: [stringActionRow],
      fetchReply: true,
      ephemeral: true
    });

    selectMenuInteractable.activate(channelSelectMessage)
  }

  // Handle legacy (emoji react based) events
  public async legacyHandle(message: Message, quoter: GuildMember): Promise<void> {
    // Generate the quoted message
    const messageOptions = await this.doQuoteAction(message, quoter);

    // Generate an Interactable and it's action row to allow deletion
    const interactable = this.generateQuotableInteractable(quoter);
    const actionRow = interactable.getActionRow();

    // Add the action row to the message and send it
    const quoteMessage = await message.channel.send({
      ...messageOptions,
      components: [actionRow]
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
    return { content: messagePreamble, embeds: [embed] };
  }

  // Generate a custom interactable to allow user to select channel to send message into
  private generateSelectMenuInteractable(message: Message, channels: GuildBasedChannel[], quoter: GuildMember): Interactable<SelectChannelProps> {
    const interactable = new Interactable<SelectChannelProps>();

    interactable.props = { quoter, message };

    const stringOptionItemList = channels.map((channel) => {
      return {
        label: channel.name,
        value: channel.id
      }
    });

    interactable.registerSelectMenuHandler(this.selectMenuHandler, {
      items: stringOptionItemList,
      placeholder: 'Select channel to quote to'
    });
    return interactable;
  }

  // Generate an Interactable to allow user deletion of quotes
  private generateQuotableInteractable(quoter: GuildMember): Interactable<QuoteDeleteProps> {
    const interactable = new Interactable<QuoteDeleteProps>();
    interactable.props = { quoter: quoter };
    interactable.registerButtonHandler(this.deleteHandler, { emoji: "❌" });
    return interactable;
  }

  private selectMenuHandler = async (interactable: Interactable<SelectChannelProps>,
    interaction: SelectMenuInteraction) => {
    const selectedChannelValue = interaction.values[0];

    // Essentially, use the interaction object to get back into the list of channels in order to have a channel object to interact with
    // Since selectMenu is only ever manipulating text based channels, we can safely cast this
    const channel: GuildTextBasedChannel = <GuildTextBasedChannel>interaction.guild.channels.cache.get(selectedChannelValue);

    // Let the user know that we're reposting the message
    await interaction.update(`Quoted to #${channel.name}`);

    // Generate the quoted message
    const messageOptions = await this.doQuoteAction(interactable.props.message, interactable.props.quoter);

    // Generate an Interactable and it's action row to allow deletion
    const quoteInteractable = this.generateQuotableInteractable(interactable.props.quoter);
    const actionRow = quoteInteractable.getActionRow();

    // Send the reply with the action row included and fetch the resulting message
    // WARN: Quite frankly not sure if fetchReply is needed as an argument, need to test if it breaks 
    const quoteMessage = await channel.send({
      ...messageOptions,
      components: [actionRow]
    });

    // Activate the Interactable
    interactable.activate(quoteMessage as Message);

    this.logger.debug(`${interaction.user.username} has reposted ${quoteMessage.id} to #${channel.name}`);
  }

  private deleteHandler = async (interactable: Interactable<QuoteDeleteProps>,
    interaction: ButtonInteraction) => {
    // Check permissions
    // Only the quoter or an admin can delete a quote
    if (interaction.member.user.id != interactable.props.quoter.id &&
      !isGuildMemberAdmin(<GuildMember>interaction.member)) {
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