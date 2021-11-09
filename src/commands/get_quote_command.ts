import { CommandProvider, Interactable, Logger, LogLevel, ModernApplicationCommandJSONBody, sendCmdReply } from "bot-framework";
import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandUserOption } from "@discordjs/builders";
import { ButtonInteraction, CommandInteraction, Message, MessageEmbed, User } from "discord.js";

import { QuoteDoc } from "../models/Quote.js";
import { getBestGuildMemberById } from "../models/UserLite.js";
import { Store } from "../support/store.js";
import { ENCORE_QUOTE_RATELIMIT } from "../constants/constants.js";


class GetQuoteProps {
  // Quote in message
  quote: QuoteDoc;
  // User query
  user?: User;
  // Scope of query
  scope: string;
}

export class GetQuoteCommand implements CommandProvider<CommandInteraction> {
  // Whether to allow another encore yet - used for rate limiting
  rateLimited: boolean;

  logger: Logger;

  constructor() {
    this.rateLimited = false;
    this.logger = new Logger("GetQuoteCommand");
  }

  public provideSlashCommands(): ModernApplicationCommandJSONBody[] {
    return [
      new SlashCommandBuilder()
        .setName('getquote')
        .setDescription('Get a random quote')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('Quoted user')
        ).toJSON(),
      new SlashCommandBuilder()
        .setName('gq')
        .setDescription('Get a random quote')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('id')
            .setDescription('Quote ID')
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('Quoted user')
        ).toJSON()
    ];
  }

  public provideHelpMessage(): string {
    return "/getquote - Get a random quote\n" + 
      "/getquote <user> - Get a random quote from a given author\n" + 
      "/getquote <id> - Get a quote by given id";
  }

  // Wrap the actual handling up, so we can allow an alternative call to the handler with a ButtonInteraction
  public async handle(interaction: CommandInteraction): Promise<void> {
    await this.doGetQuote(interaction, null);
  }

  public async doGetQuote(interaction: CommandInteraction | ButtonInteraction, encoreProps: GetQuoteProps): Promise<void> {
    // Get arguments from interaction
    const guild = interaction.guild;
    let quoteId: number = null;
    let user: User = null;

    // String to tell us who pressed the encore button if we came from an encore
    let encoreText: string = null;

    // If the interaction is a ButtonInteraction, the arguments are in altArguments
    if (interaction instanceof CommandInteraction) {
      quoteId = interaction.options.getInteger('id');
      user = interaction.options.getUser('user');
    } else {
      user = encoreProps.user;
      encoreText = `Encore by ${interaction.user.username}!`;
    }

    // If both arguments are present, abort
    if (quoteId != null && user != null) {
      sendCmdReply(interaction, 'Error: too many arguments', this.logger, LogLevel.TRACE);
      return;
    }

    // Get a quote based on the arguments
    let quote: QuoteDoc = null;
    if (quoteId != null) {
      // If 'id' is present, fetch quote by id
      quote = await Store.getQuoteBySeq(guild.id, quoteId);
    } else if (user != null) {
      // If 'user' is present, fetch random quote by user
      quote = await Store.getRandomQuoteFromAuthor(guild.id, user.id);
    } else {
      // If neither args present, fetch a random quote
      quote = await Store.getRandomQuote(guild.id);
    }

    // If the quote is not found (either due to id not existing or no quotes in the db)
    // send a message indicating so
    if (quote === null) {
      sendCmdReply(interaction, 'No quotes found', this.logger, LogLevel.DEBUG);
      return;
    }

    // Add view event to quote
    const stats = quote.getStats();
    await stats.addView(interaction.user.id);

    // Get GuildMember objects for author and quoter
    const author = await getBestGuildMemberById(guild, quote.author);
    const quoter = await getBestGuildMemberById(guild, quote.quoter);

    // Re-generate quote from stored data
    let messagePreamble = `**${quote.seq}**: **${quoter.displayName}** quoted **${author.displayName}**:`;
    if (encoreText != null) {
      // Prepend the encoreText if present
      messagePreamble = encoreText + "\n" + messagePreamble;
    }

    const embed = new MessageEmbed()
        .setAuthor(author.displayName, author.displayAvatarURL)
        .setDescription(quote.message)
        .setColor('RANDOM')
        .setTimestamp(quote.timestamp)
        .setImage(quote.img)
        .setFooter(`${stats.views.length} 📺 ${stats.likes.length} 👍 ${stats.dislikes.length} 👎`);

    // Setup interaction controls
    const interactable = new Interactable<GetQuoteProps>();
    interactable.registerHandler(this.likeableLikeHandler, { emoji: "👍" });
    interactable.registerHandler(this.likeableDislikeHandler, { emoji: "👎" });
    interactable.registerHandler(this.encoreHandler, { emoji: "👏" });
    interactable.props = new GetQuoteProps();
    interactable.props.quote = quote;
    interactable.props.user = user;
    // Query scope - just for logging
    if (user != null) {
      interactable.props.scope = `@${user.username}`;
    } else {
      interactable.props.scope = 'Guild';
    }
    

    // Get generated action row
    const actionRow = interactable.getActionRow();

    this.logger.info(`${interaction.user.username} got quote { ${guild.id} => ${quote.seq} }`);
    const message = await interaction.reply({ 
      content: messagePreamble, 
      embeds: [ embed ], 
      components: [ actionRow ], 
      fetchReply: true 
    });

    // Activate interaction handling
    interactable.activate(message as Message);
  }

  private likeableLikeHandler = async (interactable: Interactable<GetQuoteProps>, 
      interaction: ButtonInteraction): Promise<void> => {
    // Toggle like on quote
    const quote = interactable.props.quote;
    const stats = quote.getStats();
    stats.toggleLike(interaction.user.id);

    // Re-generate quote, but with updated like count
    const originalMessage = interactable.message;
    const newEmbed = new MessageEmbed(originalMessage.embeds[0])
        .setFooter(`${stats.views.length} 📺 ${stats.likes.length} 👍 ${stats.dislikes.length} 👎`);

    this.logger.debug(`${interaction.user.username} toggled like - ${quote.guild} => ${quote.seq}`);
    interaction.update({ content: originalMessage.content, embeds: [ newEmbed ] });
  };

  private likeableDislikeHandler = async (interactable: Interactable<GetQuoteProps>, 
    interaction: ButtonInteraction): Promise<void> => {
    // Toggle like on quote
    const quote = interactable.props.quote;
    const stats = quote.getStats();
    stats.toggleDislike(interaction.user.id);

    // Re-generate quote, but with updated like count
    const originalMessage = interactable.message;
    const newEmbed = new MessageEmbed(originalMessage.embeds[0])
        .setFooter(`${stats.views.length} 📺 ${stats.likes.length} 👍 ${stats.dislikes.length} 👎`);

    this.logger.debug(`${interaction.user.username} toggled like - ${quote.guild} => ${quote.seq}`);
    interaction.update({ content: originalMessage.content, embeds: [ newEmbed ] });
  };

  private encoreHandler = async (interactable: Interactable<GetQuoteProps>, 
      interaction: ButtonInteraction): Promise<void> => {
    if (this.rateLimited) {
      // Rate limited - do not perform encore
      // Send a null update so the user isn't kept waiting
      this.logger.debug(`${interaction.user.username} ratelimited for encore`);
      await interaction.update({});
      return;
    }

    // Call get quote again, but internally by passing the argument as GetQuoteProps
    this.doGetQuote(interaction, interactable.props);
    this.logger.debug(`${interaction.user.username} encored for '${interactable.props.scope}'`);

    // Prevent new encore events for ENCORE_QUOTE_RATELIMIT ms
    this.rateLimited = true;
    setTimeout(this.rateLimitTimerTask, ENCORE_QUOTE_RATELIMIT);
  };

  private rateLimitTimerTask = (): void => {
    // Allow another encore event
    this.rateLimited = false;
  }
}