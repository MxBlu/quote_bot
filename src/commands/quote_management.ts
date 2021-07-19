import { BotCommand, BotCommandHandlerFunction, CommandInterface, findGuildChannel, findGuildMember, isAdmin, Logger, LogLevel, Reactable, sendCmdMessage } from "bot-framework";
import { Guild, GuildMember, MessageEmbed, MessageReaction } from "discord.js";

import { QuoteDoc, QuoteMultiQuery } from "../models/Quote.js";
import { getBestGuildMemberById } from "../models/UserLite.js";
import { Store } from "../support/store.js";

class ListQuoteProps {
  // List query
  query: QuoteMultiQuery;
  // Query scope
  scope: string;
  // Current index
  skip = 0;
}

class LikeableProps {
  // Quote in message
  quote: QuoteDoc;
}

export class QuoteManagementHandler implements CommandInterface {
  logger: Logger;

  constructor() {
    this.logger = new Logger("QuoteManagementHandler");
  }

  commands(): Map<string, BotCommandHandlerFunction> {
    const commands = new Map<string, BotCommandHandlerFunction>();

    commands.set("listquotes", this.listquotesHandler);
    commands.set("lq", this.listquotesHandler);
    commands.set("getquote", this.getquoteHandler);
    commands.set("gq", this.getquoteHandler);
    commands.set("delquote", this.delquoteHandler);
    commands.set("dq", this.delquoteHandler);
    commands.set("reattrquote", this.reattrquoteHandler);
    commands.set("rq", this.reattrquoteHandler);

    return commands;
  }

  public listquotesHandler = async (command: BotCommand): Promise<void> => {
    const guild = command.message.guild;
    let query: QuoteMultiQuery = null; // Array of quotes for given criteria
    let scope = ''; // Scope of list query
    let start = 0; // Starting seq id

    switch (command.arguments.length) {
    case 0:
      // List all quotes from the guild
      query = Store.getQuotesByGuild(guild.id);
      scope = "Guild";
      break;
    case 1:
    case 2:
      // Handle as quotes seq number start if first arg is numerical
      if (command.arguments[0].match(/^\d+$/)) {
        start = Number(command.arguments[0]);
        query = Store.getQuotesByGuild(guild.id)
            .where('seq').gte(start);
        scope = "Guild";
        break;
      } else if (command.arguments[1]?.match(/^\d+$/)) {
        start = Number(command.arguments[1]);
      }

      // If first arg is a channel, get all quotes for given channel
      const potentialChannel = await findGuildChannel(command.arguments[0], guild);
      if (potentialChannel != null) {
        query = Store.getQuotesByChannel(potentialChannel.id)
            .where('seq').gte(start);
        scope = `Channel #${potentialChannel.name}`;
        break;
      }

      // If first arg is a user, get all quotes for given user
      const potentialUser = await findGuildMember(command.arguments[0], guild);
      if (potentialUser != null) {
        query = Store.getQuotesByAuthor(potentialUser.id, guild.id)
            .where('seq').gte(start);
        scope = `Author @${potentialUser.displayName}`;
        break;
      }
      break;
    default:
      // If excessive arguments, send an error
      sendCmdMessage(command.message, 'Error: too many arguments', this.logger, LogLevel.TRACE);
      return;
    }

    // Couldn't match any criterias, so query is invalid
    if (query == null) {
      sendCmdMessage(command.message, 'Invalid query', this.logger, LogLevel.DEBUG);
      return;
    }

    // Execute the query and get 10 quotes
    const quotes: QuoteDoc[] = await query.limit(10).exec();

    // If the result set is effectively empty, send a message indicating so
    if (quotes === null || quotes.length == 0) {
      sendCmdMessage(command.message, 'No quotes found', this.logger, LogLevel.DEBUG);
      return;
    }

    // Generate a list of quote messages
    const quoteMsgs = await this.generateQuoteMsgs(command.message.guild, quotes);

    // Append ID if the start value is set
    if (start > 0) {
      scope += ` - From id ${start}`;
    }

    // Create embed to display quotes
    const embed = new MessageEmbed()
        .setTitle(`Quotes - ${scope}`)
        .setDescription(quoteMsgs.join("\n"))
    
    // Send initial embed
    this.logger.info(`${command.message.author.username} listed quotes - ${scope}`);
    const message = await command.message.channel.send(embed);

    // Create scrollable modal
    const reactable = new Reactable<ListQuoteProps>(message);
    reactable.registerHandler("⬅️", this.listQuotesLeftHandler);
    reactable.registerHandler("➡️", this.listQuotesRightHandler);
    reactable.props = new ListQuoteProps();
    reactable.props.query = query;
    reactable.props.scope = scope;

    // Activate and track the modal
    reactable.activate(true);
  }

  public getquoteHandler = async (command: BotCommand): Promise<void> => {
    const guild = command.message.guild;
    let quote: QuoteDoc = null;

    switch (command.arguments.length) {
    case 0:
      // Get random quote
      quote = await Store.getRandomQuote(guild.id);
      break;
    case 1:
      // If first arg is a number
      // Get quote with given seq ID
      if (command.arguments[0].match(/^\d+$/)) {
        quote = await Store.getQuoteBySeq(guild.id, 
            Number(command.arguments[0])).exec();
        break;
      }

      // if first arg is a user, get all quotes for given user
      const potentialUser = await findGuildMember(command.arguments[0], guild);
      if (potentialUser != null) {
        quote = await Store.getRandomQuoteFromAuthor(guild.id, potentialUser.id);
        break;
      }
      break;
    default:
      // If excessive arguments, send an error
      sendCmdMessage(command.message, 'Error: too many arguments', this.logger, LogLevel.TRACE);
      return;
    }

    // If the quote is not found (either due to id not existing or no quotes in the db)
    // send a message indicating so
    if (quote === null) {
      sendCmdMessage(command.message, 'No quotes found', this.logger, LogLevel.DEBUG);
      return;
    }

    // Add view event to quote
    const stats = quote.getStats();
    await stats.addView(command.message.author.id);

    // Get GuildMember objects for author and quoter
    const author = await getBestGuildMemberById(command.message.guild, quote.author);
    const quoter = await getBestGuildMemberById(command.message.guild, quote.quoter);

    // Re-generate quote from stored data
    const messagePreamble = `**${quote.seq}**: **${quoter.displayName}** quoted **${author.displayName}**:`;
    const embed = new MessageEmbed()
        .setAuthor(author.displayName, author.displayAvatarURL)
        .setDescription(quote.message)
        .setColor('RANDOM')
        .setTimestamp(quote.timestamp)
        .setImage(quote.img)
        .setFooter(`${stats.views.length} 📺 ${stats.likes.length} 👍 ${stats.dislikes.length} 👎`);

    this.logger.info(`${command.message.author.username} got quote { ${guild.id} => ${quote.seq} }`);
    const message = await command.message.channel.send(messagePreamble, embed);

    // Create reactable with like/dislike buttons
    const reactable = new Reactable<LikeableProps>(message);
    reactable.registerHandler("👍", this.likeableLikeHandler);
    reactable.registerHandler("👎", this.likeableDislikeHandler);
    reactable.props = new LikeableProps();
    reactable.props.quote = quote;

    // Activate and track the modal
    reactable.activate(true);
  }

  public delquoteHandler = async (command: BotCommand): Promise<void> => {
    const guildId = command.message.guild.id;
    switch (command.arguments.length) {
    case 1:
      // Delete quote with given seq ID
      try {
        // Attempt to delete quote with given id
        const res = await Store.delQuote(guildId, 
            Number(command.arguments[0])).exec();
        if (res.deletedCount != null && res.deletedCount > 0) {
          sendCmdMessage(command.message, `Quote ${command.arguments[0]} deleted.`, this.logger, LogLevel.INFO);
          return;
        } else {
          sendCmdMessage(command.message, `Error: quote ${command.arguments[0]} doesn't exist`, this.logger, LogLevel.TRACE);
          return;
        }
      } catch (e) {
        sendCmdMessage(command.message, 'Error: invalid argument', this.logger, LogLevel.TRACE);
        return;
      }
      break;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.TRACE);
      return;
    }
  }

  public reattrquoteHandler = async (command: BotCommand): Promise<void> => {
    if (! await isAdmin(command.message)) {
      sendCmdMessage(command.message, 'Error: not admin', this.logger, LogLevel.DEBUG);
      return;
    }

    const guild = command.message.guild;
    let newAuthor: GuildMember = null;
    let quote: QuoteDoc = null;

    switch (command.arguments.length) {
    case 2:
      // Reattribute a quote to a given user
      // Admin only
      try {
        const quoteId = Number(command.arguments[0]);
        
        // Get the user to reattribute to
        newAuthor = await findGuildMember(command.arguments[1], guild);

        if (newAuthor == null) {
          sendCmdMessage(command.message, `Error: user does not exist`, this.logger, LogLevel.TRACE);
          return;
        }

        quote = await Store.getQuoteBySeq(guild.id, quoteId);
        if (quote == null) {
          sendCmdMessage(command.message, `Error: invalid quote ID`, this.logger, LogLevel.TRACE);
          return;
        }
      } catch (e) {
        sendCmdMessage(command.message, 'Error: invalid argument', this.logger, LogLevel.TRACE);
        return;
      }
      break;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', this.logger, LogLevel.TRACE);
      return;
    }

    // Update the author field and save to db
    quote.author = newAuthor.id;
    quote.save();
    sendCmdMessage(command.message, `Reattributed quote to ${newAuthor.displayName}`, this.logger, LogLevel.INFO);
  }

  // Generate quote display lines
  private async generateQuoteMsgs(guild: Guild, quotes: QuoteDoc[]): Promise<string[]> {
    // Generate array of quote display lines
    const quoteMsgs: string[] = [];
    for (const quote of quotes) {
      // Get author and quoter GuildMember objects best we can
      const author = await getBestGuildMemberById(guild, quote.author);
      const quoter = await getBestGuildMemberById(guild, quote.quoter);

      // Generate a list of quote links for 'listquotes'
      quoteMsgs.push(`${quote.seq}: [**${quoter.displayName}** quoted **${author.displayName}** ` +
          `(${quote.timestamp.toLocaleString()})](${quote.link})`);
    }

    return quoteMsgs;
  }

  private listQuotesLeftHandler = async (reactable: Reactable<ListQuoteProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    const props: ListQuoteProps = reactable.props;
    if (props.skip == 0) {
      // Already left-most, loop around

      // Count total results in cloned query
      // The max number limit this is to bypass the limit value set prior
      const resCount = await Store.cloneQuoteQuery(props.query)
          .limit(Number.MAX_SAFE_INTEGER).countDocuments();
      // Go to the next lowest value of 10 (ensuring we don't end up on the same value)
      props.skip = (resCount - 1) - ((resCount - 1) % 10);
    } else {
      // Go back 10 results
      props.skip -= 10;
    }

    // Cloned query with our new "skip" value
    const quotes = await Store.cloneQuoteQuery(props.query)
        .skip(props.skip).limit(10).exec();
    
    // Convert new results into quote display lines
    const quoteMsgs = await this.generateQuoteMsgs(reactable.message.guild, quotes);
    
    // Modify original message with new quotes
    this.logger.debug(`${user.user.username} navigated quote list - ${props.scope} skip ${props.skip}`);
    reactable.message.edit(new MessageEmbed()
        .setTitle(`Quotes - ${props.scope}`)
        .setDescription(quoteMsgs.join("\n"))
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }

  private listQuotesRightHandler = async (reactable: Reactable<ListQuoteProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    const props: ListQuoteProps = reactable.props;
    // Go forward 10 results
    props.skip += 10;

    // Cloned query with our new "skip" value
    let quotes = await Store.cloneQuoteQuery(props.query)
        .skip(props.skip).limit(10).exec();

    if (quotes.length == 0) {
      // We've gone past the last page, reset
      props.skip = 0;
      quotes = await Store.cloneQuoteQuery(props.query)
          .skip(props.skip).limit(10).exec();
    }
    
    // Convert new results into quote display lines
    const quoteMsgs = await this.generateQuoteMsgs(reactable.message.guild, quotes);
    
    // Modify original message with new quotes
    this.logger.debug(`${user.user.username} navigated quote list - ${props.scope} skip ${props.skip}`);
    reactable.message.edit(new MessageEmbed()
        .setTitle(`Quotes - ${props.scope}`)
        .setDescription(quoteMsgs.join("\n"))
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }

  private likeableLikeHandler = async (reactable: Reactable<LikeableProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    // Toggle like on quote
    const quote = reactable.props.quote;
    const stats = quote.getStats();
    stats.toggleLike(user.id);

    // Re-generate quote, but with updated like count
    const originalMessage = reactable.message;
    const newEmbed = new MessageEmbed(originalMessage.embeds[0])
        .setFooter(`${stats.views.length} 📺 ${stats.likes.length} 👍 ${stats.dislikes.length} 👎`);
    originalMessage.edit({ content: originalMessage.content, embed: newEmbed });
  };

  private likeableDislikeHandler = async (reactable: Reactable<LikeableProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    // Toggle like on quote
    const quote = reactable.props.quote;
    const stats = quote.getStats();
    stats.toggleDislike(user.id);

    // Re-generate quote, but with updated like count
    const originalMessage = reactable.message;
    const newEmbed = new MessageEmbed(originalMessage.embeds[0])
        .setFooter(`${stats.views.length} 📺 ${stats.likes.length} 👍 ${stats.dislikes.length} 👎`);
    originalMessage.edit({ content: originalMessage.content, embed: newEmbed });
  };
  
}