import { Guild, GuildChannel, GuildMember, MessageEmbed, MessageReaction } from "discord.js";
import { sendCmdMessage, stringEquivalence, stringSearch } from "../../util/bot_utils.js";
import { Logger } from "../../util/logger.js";
import { Quote, QuoteMultiQuery } from "../../util/models/Quote.js";
import { ScrollableModal, ScrollableModalManager } from "../../util/scrollable.js";
import { Store } from "../../util/store.js";
import { BotCommand } from "../bot.js";

class ListQuoteModalProps {
  // List query
  query: QuoteMultiQuery;
  // Query scope
  scope: string;
  // Current index
  skip = 0;
}

export class QuoteManagementHandler {
  logger: Logger;

  scrollableManager: ScrollableModalManager;

  constructor(scrollableManager: ScrollableModalManager) {
    this.scrollableManager = scrollableManager;
    this.logger = new Logger("QuoteManagementHandler");
  }

  public listquotesHandler = async (command: BotCommand): Promise<void> => {
    const guildId = command.message.guild.id;
    let query: QuoteMultiQuery = null; // Array of quotes for given criteria
    let scope = ''; // Scope of list query
    let start = 0; // Starting seq id

    switch (command.arguments.length) {
    case 0:
      // List all quotes from the guild
      query = Store.get().getQuotesByGuild(guildId);
      scope = "Guild";
      break;
    case 1:
    case 2:
      // Handle as quotes seq number start if first arg is numerical
      if (command.arguments[0].match(/^\d+$/)) {
        start = Number(command.arguments[0]);
        query = Store.get().getQuotesByGuild(guildId)
            .where('seq').gte(start);
        scope = "Guild";
        break;
      } else if (command.arguments[1]?.match(/^\d+$/)) {
        start = Number(command.arguments[1]);
      }

      // Handle if first arg may be a channel name or channel mention
      const channelRx = command.arguments[0].match(/^<#(\d+)>$/);
      let potentialChannel: GuildChannel = null;
      if (channelRx != null) {
        potentialChannel = command.message.guild.channels.cache.get(channelRx[1]);
      } else {
        potentialChannel = command.message.guild.channels
            .cache.find(c => stringEquivalence(c.name, command.arguments[0]));
      }

      // If criteria passes, get all quotes for given channel
      if (potentialChannel != null) {
        query = Store.get().getQuotesByChannel(potentialChannel.id)
            .where('seq').gte(start);
        scope = `Channel #${potentialChannel.name}`;
        break;
      }

      // Handle if first arg may be a username or user nickname
      const userRx = command.arguments[0].match(/^<@!(\d+)>$/);
      let potentialUser: GuildMember = null;
      if (userRx != null) {
        potentialUser = command.message.guild.members.cache.get(userRx[1]);
      } else {
        potentialUser = command.message.guild.members
          .cache.find(m => stringSearch(m.nickname, command.arguments[0]) || 
                        stringSearch(m.user.username, command.arguments[0]));
      }
      
      // If criteria passes, get all quotes for given user
      if (potentialUser != null) {
        query = Store.get().getQuotesByAuthor(potentialUser.id, guildId)
            .where('seq').gte(start);
        scope = `Author @${potentialUser.displayName}`;
        break;
      }
      break;
    default:
      // If excessive arguments, send an error
      sendCmdMessage(command.message, 'Error: too many arguments', 3, this.logger);
      return;
    }

    // Couldn't match any criterias, so query is invalid
    if (query == null) {
      sendCmdMessage(command.message, 'Invalid query', 2, this.logger);
      return;
    }

    // Execute the query and get 10 quotes
    const quotes: Quote[] = await query.limit(10).exec();

    // If the result set is effectively empty, send a message indicating so
    if (quotes === null || quotes.length == 0) {
      sendCmdMessage(command.message, 'No quotes found', 2, this.logger);
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
    this.logger.info(`${command.message.author.username} listed quotes - ${scope}`, 2);
    const message = await command.message.channel.send(embed);

    // Create scrollable modal
    const scrollable = new ScrollableModal<ListQuoteModalProps>();
    scrollable.scrollLeftHandler = this.listQuotesLeftHandler;
    scrollable.scrollRightHandler =  this.listQuotesRightHandler;
    scrollable.message = message;
    scrollable.props = new ListQuoteModalProps();
    scrollable.props.query = query;
    scrollable.props.scope = scope;

      
  }

  public getquoteHandler = async (command: BotCommand): Promise<void> => {
    const guildId = command.message.guild.id;
    let quote: Quote = null;

    switch (command.arguments.length) {
    case 0:
      // Get random quote
      quote = await Store.get().getRandomQuote(guildId);
      break;
    case 1:
      // Get quote with given seq ID
      try {
        quote = await Store.get()
            .getQuoteBySeq(guildId, parseInt(command.arguments[0])).exec();
      } catch (e) {
        // Will be thrown if argument is non-integer
        sendCmdMessage(command.message, 'Error: invalid argument', 3, this.logger);
        return;
      }
      break;
    default:
      // If excessive arguments, send an error
      sendCmdMessage(command.message, 'Error: too many arguments', 3, this.logger);
      return;
    }

    // If the quote is not found (either due to id not existing or no quotes in the db)
    // send a message indicating so
    if (quote === null) {
      sendCmdMessage(command.message, 'No quotes found', 2, this.logger);
      return;
    }

    // Get GuildMember objects for author and quoter
    const author = await command.message.guild.members.fetch(quote.author);
    const quoter = await command.message.guild.members.fetch(quote.quoter);
    // Get nickname or username if not available
    const author_name = author.nickname || author.user.username;
    const quoter_name = quoter.nickname || quoter.user.username;

    // Re-generate quote from stored data
    const messagePreamble = `**${quote.seq}**: **${quoter_name}** quoted **${author_name}**:`;
    const avatar_url = (author.user.avatar &&
      `https://cdn.discordapp.com/avatars/${author.id}/${author.user.avatar}.png`) ||
      author.user.defaultAvatarURL;
    const embed = new MessageEmbed()
        .setAuthor(author_name, avatar_url)
        .setDescription(quote.message)
        .setColor('RANDOM')
        .setTimestamp(quote.timestamp)
        .setImage(quote.img);

    this.logger.info(`${command.message.author.username} got quote { ${guildId} => ${quote.seq} }`, 2);
    command.message.channel.send(messagePreamble, embed);
  }

  public delquoteHandler = async (command: BotCommand): Promise<void> => {
    const guildId = command.message.guild.id;
    switch (command.arguments.length) {
    case 1:
      // Delete quote with given seq ID
      try {
        // Attempt to delete quote with given id
        const res = await Store.get()
            .delQuote(guildId, parseInt(command.arguments[0])).exec();
        if (res.deletedCount != null && res.deletedCount > 0) {
          sendCmdMessage(command.message, `Quote ${command.arguments[0]} deleted.`, 2, this.logger);
          return;
        } else {
          sendCmdMessage(command.message, `Error: quote ${command.arguments[0]} doesn't exist`, 2, this.logger);
          return;
        }
      } catch (e) {
        sendCmdMessage(command.message, 'Error: invalid argument', 3, this.logger);
        return;
      }
      break;
    default:
      sendCmdMessage(command.message, 'Error: incorrect argument count', 3, this.logger);
      return;
    }
  }

  // Generate quote display lines
  private async generateQuoteMsgs(guild: Guild, quotes: Quote[]): Promise<string[]> {
    // Generate array of quote display lines
    const quoteMsgs: string[] = [];
    for (const quote of quotes) {
      // Get author and quoter GuildMember objects best we can
      // let author = await getBestGuildMemberById(db, command.message.guild, quote.author);
      // let quoter = await getBestGuildMemberById(db, command.message.guild, quote.quoter);
      const author = await guild.members.fetch(quote.author);
      const quoter = await guild.members.fetch(quote.quoter);

      // Generate a list of quote links for 'listquotes'
      quoteMsgs.push(`${quote.seq}: [**${quoter.displayName}** quoted **${author.displayName}** ` +
          `(${quote.timestamp.toLocaleString()})](${quote.link})`);
    }

    return quoteMsgs;
  }

  private listQuotesLeftHandler = async (modal: ScrollableModal<ListQuoteModalProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    const props: ListQuoteModalProps = modal.props;
    if (props.skip == 0) {
      // Already left-most, loop around

      // Count total results in cloned query
      // The max number limit this is to bypass the limit value set prior
      const resCount = await Store.get().cloneQuoteQuery(props.query)
          .limit(Number.MAX_SAFE_INTEGER).countDocuments();
      // Go to the next lowest value of 10 (ensuring we don't end up on the same value)
      props.skip = (resCount - 1) - ((resCount - 1) % 10);
    } else {
      // Go back 10 results
      props.skip -= 10;
    }

    // Cloned query with our new "skip" value
    const quotes = await Store.get().cloneQuoteQuery(props.query)
        .skip(props.skip).limit(10).exec();
    
    // Convert new results into quote display lines
    const quoteMsgs = await this.generateQuoteMsgs(modal.message.guild, quotes);
    
    // Modify original message with new quotes
    this.logger.info(`${user.user.username} navigated quote list - ${props.scope} skip ${props.skip}`, 2);
    modal.message.edit(new MessageEmbed()
        .setTitle(`Quotes - ${props.scope}`)
        .setDescription(quoteMsgs.join("\n"))
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }

  private listQuotesRightHandler = async (modal: ScrollableModal<ListQuoteModalProps>, 
      reaction: MessageReaction, user: GuildMember): Promise<void> => {
    const props: ListQuoteModalProps = modal.props;
    // Go forward 10 results
    props.skip += 10;

    // Cloned query with our new "skip" value
    let quotes = await Store.get().cloneQuoteQuery(props.query)
        .skip(props.skip).limit(10).exec();

    if (quotes.length == 0) {
      // We've gone past the last page, reset
      props.skip = 0;
      quotes = await Store.get().cloneQuoteQuery(props.query)
          .skip(props.skip).limit(10).exec();
    }
    
    // Convert new results into quote display lines
    const quoteMsgs = await this.generateQuoteMsgs(modal.message.guild, quotes);
    
    // Modify original message with new quotes
    this.logger.info(`${user.user.username} navigated quote list - ${props.scope} skip ${props.skip}`, 2);
    modal.message.edit(new MessageEmbed()
        .setTitle(`Quotes - ${props.scope}`)
        .setDescription(quoteMsgs.join("\n"))
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }
  
}