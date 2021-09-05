
import { CommandProvider, GeneralSlashCommandBuilder, Interactable, Logger, LogLevel, sendCmdReply } from "bot-framework";
import { SlashCommandBuilder, SlashCommandChannelOption, SlashCommandIntegerOption, SlashCommandUserOption } from "@discordjs/builders";
import { ButtonInteraction, CommandInteraction, Message, MessageEmbed } from "discord.js";

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
  // Number of quotes total
  count = 0;
}

export class ListQuotesCommand implements CommandProvider {
  logger: Logger;

  constructor() {
    this.logger = new Logger("ListQuotesCommand");
  }

  public provideSlashCommands(): GeneralSlashCommandBuilder[] {
    return [
      new SlashCommandBuilder()
        .setName('listquotes')
        .setDescription('List quotes for given filters')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('idstart')
            .setDescription('Starting ID')
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('Quoted user')
        )
        .addChannelOption(
          new SlashCommandChannelOption()
            .setName('channel')
            .setDescription('Quoted channel')
        ),
      new SlashCommandBuilder()
        .setName('lq')
        .setDescription('List quotes for given filters')
        .addIntegerOption(
          new SlashCommandIntegerOption()
            .setName('idstart')
            .setDescription('Starting ID')
        )
        .addUserOption(
          new SlashCommandUserOption()
            .setName('user')
            .setDescription('Quoted user')
        )
        .addChannelOption(
          new SlashCommandChannelOption()
            .setName('channel')
            .setDescription('Quoted channel')
        )
    ];
  }

  public provideHelpMessage(): string {
    return "/listquotes [<id start>] - Get quotes from this guild, optionally starting from <id start>\n" + 
      "/listquotes <filter> [<id start>] - Get quotes from a given channel or author, optionally starting from <id start>";
  }

  public async handle(interaction: CommandInteraction): Promise<void> {
    // Get arguments from interaction
    const guild = interaction.guild;
    const quoteIdStart = interaction.options.getInteger('idstart');
    const user = interaction.options.getUser('user');
    const channel = interaction.options.getChannel('channel');

    // If both arguments are present, abort
    if (user != null && channel != null) {
      sendCmdReply(interaction, 'Error: too many arguments', this.logger, LogLevel.TRACE);
      return;
    }

    let query: QuoteMultiQuery = null; // MongoDB query for requets
    let scope = ''; // Scope of list query
    let start = 0; // Starting seq id

    // If we have a custom starting id, set it
    if (quoteIdStart != null) {
      start = quoteIdStart;
    }

    if (user != null) {
      // List quotes for a given user
      query = Store.getQuotesByAuthor(user.id, guild.id)
          .where('seq').gte(start);
      scope = `Author @${user.username}`;
    } else if (channel != null) {
      // List quotes in a given channel
      query = Store.getQuotesByChannel(channel.id)
          .where('seq').gte(start);
      scope = `Channel #${channel.name}`;
    } else {
      // List quotes in the guild
      query = Store.getQuotesByGuild(guild.id)
          .where('seq').gte(start);
      scope = "Guild";
    }

    // Execute the query and get 10 quotes
    const quotes: QuoteDoc[] = await query.limit(10).exec();

    // If the result set is effectively empty, send a message indicating so
    if (quotes === null || quotes.length == 0) {
      sendCmdReply(interaction, 'No quotes found', this.logger, LogLevel.DEBUG);
      return;
    }

    // Generate a list of quote messages
    const quoteMsgs = await generateQuoteMsgs(guild, quotes);

    // Append ID if the start value is set
    if (start > 0) {
      scope += ` - From id ${start}`;
    }

    // Count total results in cloned query
    // The max number limit this is to bypass the limit value set prior
    const count = await Store.cloneQuoteQuery(query)
        .limit(Number.MAX_SAFE_INTEGER).countDocuments();

    // Append count on to scope
    scope += ` (${count})`;

    // Create embed to display quotes
    const embed = new MessageEmbed()
        .setTitle(`Quotes - ${scope}`)
        .setDescription(quoteMsgs.join("\n"))

    // Setup interaction controls
    const interactable = new Interactable<ListQuoteProps>();
    interactable.registerHandler(this.listQuotesLeftHandler, { emoji: "⬅️" });
    interactable.registerHandler(this.listQuotesRightHandler, { emoji: "➡️" });
    interactable.props = new ListQuoteProps();
    interactable.props.query = query;
    interactable.props.scope = scope;
    interactable.props.count = count;
    
    // Get generated action row
    const actionRow = interactable.getActionRow();

    // Send initial embed
    this.logger.info(`${interaction.user.username} listed quotes - ${scope}`);
    const message = await interaction.reply({ 
      embeds: [ embed ], 
      components: [ actionRow ], 
      fetchReply: true 
    });

    // Activate interaction handling
    interactable.activate(message as Message);
  }

  private listQuotesLeftHandler = async (interactable: Interactable<ListQuoteProps>, 
      interaction: ButtonInteraction): Promise<void> => {
    const props: ListQuoteProps = interactable.props;
    if (props.skip == 0) {
      // Already left-most, loop around
      // Go to the next lowest value of 10 (ensuring we don't end up on the same value)
      props.skip = (props.count - 1) - ((props.count - 1) % 10);
    } else {
      // Go back 10 results
      props.skip -= 10;
    }

    // Cloned query with our new "skip" value
    const quotes = await Store.cloneQuoteQuery(props.query)
        .skip(props.skip).limit(10).exec();
    
    // Convert new results into quote display lines
    const quoteMsgs = await generateQuoteMsgs(interaction.guild, quotes);

    // Modify original embed with new quotes
    const newEmbed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed)
        .setDescription(quoteMsgs.join("\n"))
        .setFooter(props.skip > 0 ? `+${props.skip}` : '');
    
    this.logger.debug(`${interaction.user.username} navigated quote list - ${props.scope} skip ${props.skip}`);
    interaction.update({ embeds: [ newEmbed ] });
  }

  private listQuotesRightHandler = async (interactable: Interactable<ListQuoteProps>, 
    interaction: ButtonInteraction): Promise<void> => {
    const props: ListQuoteProps = interactable.props;
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
    const quoteMsgs = await generateQuoteMsgs(interaction.guild, quotes);
    
    // Modify original embed with new quotes
    const newEmbed = new MessageEmbed(interaction.message.embeds[0] as MessageEmbed)
        .setDescription(quoteMsgs.join("\n"))
        .setFooter(props.skip > 0 ? `+${props.skip}` : '');
    
    this.logger.debug(`${interaction.user.username} navigated quote list - ${props.scope} skip ${props.skip}`);
    interaction.update({ embeds: [ newEmbed ] });
  }

}