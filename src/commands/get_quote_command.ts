import { BotCommand, CommandProvider, findGuildMember, Logger, LogLevel, Reactable, sendCmdMessage } from "bot-framework";
import { GuildMember, MessageEmbed, MessageReaction } from "discord.js";

import { QuoteDoc } from "../models/Quote.js";
import { getBestGuildMemberById } from "../models/UserLite.js";
import { Store } from "../support/store.js";

class LikeableProps {
  // Quote in message
  quote: QuoteDoc;
}

export class GetQuoteCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GetQuoteCommand");
  }

  public provideAliases(): string[] {
    return [ "getquote", "gq" ];
  }

  public provideHelpMessage(): string {
    return "!getquote - Get a random quote\n" + 
      "!getquote <filter> - Get a random quote from a given author\n" + 
      "!getquote <id> - Get a quote by given id";
  }

  public async handle(command: BotCommand): Promise<void> {
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

    this.logger.debug(`${user.user.username} toggled like - ${quote.guild} => ${quote.seq}`);
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
        
    this.logger.debug(`${user.user.username} toggled dislike - ${quote.guild} => ${quote.seq}`);
    originalMessage.edit({ content: originalMessage.content, embed: newEmbed });
  };
}