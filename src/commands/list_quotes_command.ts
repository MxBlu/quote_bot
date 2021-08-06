import { BotCommand, CommandProvider, findGuildChannel, findGuildMember, Logger, LogLevel, Reactable, sendCmdMessage } from "bot-framework";
import { GuildMember, MessageEmbed, MessageReaction } from "discord.js";

import { QuoteDoc, QuoteMultiQuery } from "../models/Quote.js";
import { generateQuoteMsgs } from "../support/quote_utils.js";
import { Store } from "../support/store.js";

class ListQuoteProps {
  // List query
  query: QuoteMultiQuery;
  // Query scope
  scope: string;
  // Current index
  skip = 0;
}

export class ListQuotesCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("ListQuotesCommand");
  }
  
  public provideAliases(): string[] {
    return [ "listquotes", "lq" ];
  }

  public provideHelpMessage(): string {
    return "!listquotes [<id start>] - Get quotes from this guild, optionally starting from <id start>\n" + 
      "!listquotes <filter> [<id start>] - Get quotes from a given channel or author, optionally starting from <id start>";
  }

  public async handle(command: BotCommand): Promise<void> {
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
    const quoteMsgs = await generateQuoteMsgs(command.message.guild, quotes);

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
    const quoteMsgs = await generateQuoteMsgs(reactable.message.guild, quotes);
    
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
    const quoteMsgs = await generateQuoteMsgs(reactable.message.guild, quotes);
    
    // Modify original message with new quotes
    this.logger.debug(`${user.user.username} navigated quote list - ${props.scope} skip ${props.skip}`);
    reactable.message.edit(new MessageEmbed()
        .setTitle(`Quotes - ${props.scope}`)
        .setDescription(quoteMsgs.join("\n"))
        .setFooter(props.skip > 0 ? `+${props.skip}` : ''));
  }

}