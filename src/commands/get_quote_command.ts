import { CommandProvider, GeneralSlashCommandBuilder, Logger, LogLevel, Reactable, sendCmdReply } from "bot-framework";
import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandNumberOption, SlashCommandUserOption } from "@discordjs/builders";
import { CommandInteraction, GuildMember, Message, MessageEmbed, MessageReaction } from "discord.js";

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

  public provideSlashCommands(): GeneralSlashCommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('getquote')
        .setDescription('Get a random quote')
        .addNumberOption(
          new SlashCommandNumberOption()
            .setName('id')
            .setDescription('Quote ID')
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('Quoted user')
        ),
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
        )
    ];
  }

  public provideHelpMessage(): string {
    return "/getquote - Get a random quote\n" + 
      "/getquote <user> - Get a random quote from a given author\n" + 
      "/getquote <id> - Get a quote by given id";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    // Get arguments from interaction
    const guild = interaction.guild;
    const quoteId = interaction.options.getInteger('id');
    const user = interaction.options.getUser('user');

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
    const messagePreamble = `**${quote.seq}**: **${quoter.displayName}** quoted **${author.displayName}**:`;
    const embed = new MessageEmbed()
        .setAuthor(author.displayName, author.displayAvatarURL)
        .setDescription(quote.message)
        .setColor('RANDOM')
        .setTimestamp(quote.timestamp)
        .setImage(quote.img)
        .setFooter(`${stats.views.length} 📺 ${stats.likes.length} 👍 ${stats.dislikes.length} 👎`);

    this.logger.info(`${interaction.user.username} got quote { ${guild.id} => ${quote.seq} }`);
    const message = await interaction.reply({ content: messagePreamble, embeds: [ embed ], fetchReply: true });

    // Create reactable with like/dislike buttons
    const reactable = new Reactable<LikeableProps>(message as Message);
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
    originalMessage.edit({ content: originalMessage.content, embeds: [ newEmbed ] });
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
    originalMessage.edit({ content: originalMessage.content, embeds: [ newEmbed ] });
  };
}