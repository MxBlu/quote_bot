import { BaseBot, ClientOptionsWithoutIntents, Dependency } from "bot-framework";
import { MessageReaction, User, PartialUser, Intents, GuildMember } from "discord.js";

import { Store, StoreDependency } from "../support/store.js";
import { QuoteEventHandler } from "../events/quote_event.js";
import { ListQuotesCommand } from "../commands/list_quotes_command.js";
import { GetQuoteCommand } from "../commands/get_quote_command.js";
import { DelQuoteCommand } from "../commands/del_quote_command.js";
import { ReattrQuoteCommand } from "../commands/reattr_quote_command.js";
import { SpoilerQuoteCommand } from "../commands/spoiler_quote_command.js";

export class QuoteBotImpl extends BaseBot {

  // Command handlers
  quoteEventHandler: QuoteEventHandler;

  constructor() {
    super("QuoteBot");
  }

  public override async init(discordToken: string): Promise<void> {
    // Wait on Store to be ready
    await StoreDependency.await();

    // Without the MESSAGE partial, reactions on messages before bot startup are ignored
    // I don't recall why the REACTION partial is around, probably for good reason
    // GUILD_MEMBER partial allows quoting of members who have left the server
    const options: ClientOptionsWithoutIntents = {
      partials: [ "MESSAGE", "REACTION", "GUILD_MEMBER" ]
    };
    
    // Intents to match Discord events we want
    const intents = [
      Intents.FLAGS.GUILDS, // Without this, channels are never defined within Discord.js....
      Intents.FLAGS.GUILD_MEMBERS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ];
    
    super.init(discordToken, intents, options);
  }

  public loadProviders(): void {
    this.providers.push(new ListQuotesCommand());
    this.providers.push(new GetQuoteCommand());
    this.providers.push(new DelQuoteCommand());
    this.providers.push(new ReattrQuoteCommand());
    this.providers.push(new SpoilerQuoteCommand());
  }
  
  public override initCustomEventHandlers(): void {
    this.quoteEventHandler =  new QuoteEventHandler();

    this.discord.once('ready', this.onreadyHandler);
    this.discord.on('messageReactionAdd', this.reactionHandler);
    this.discord.on('guildMemberAdd', this.memberUpdateHandler);
    this.discord.on('guildMemberUpdate', (_, m) => this.memberUpdateHandler(m)); // ignore 'old member' param
  }

  public override getHelpMessage(): string {
    return "Quote Bot v2 - Quote and save messages\n" + 
      "\n" + 
      "Add a #️⃣ react to a message to quote the message\n" + 
      "Add a ♿ or :omegaChair: emote to save a quote";
  }

  // Discord event handlers

  private onreadyHandler = async (): Promise<void> => {
    // Call fetch on every guild to make sure we have all the members cached
    this.discord.guilds.cache.map(
      g => g.members.fetch()
          .then(c => c.map(m => this.memberUpdateHandler(m)))
          .then(() => this.logger.debug(`Cached members for ${g.id}`))
    );
    QuoteBotDependency.ready();
  }

  private memberUpdateHandler = async (member: GuildMember): Promise<void> => {
    // Store member data in DB
    await Store.upsertUser(member.id, member.guild.id, member.displayName, member.user.discriminator);
    this.logger.trace(`Updated member '${member.displayName}' for guild '${member.guild.id}'`);
  }

  private reactionHandler = async (reaction: MessageReaction, user: User | PartialUser): Promise<void> => {
    // Dumb ass shit cause Discord.js doesn't resolve them
    reaction = await reaction.fetch();
    const guildMember = await reaction.message.guild.members.fetch(user.id);

    this.logger.trace(`Reaction with emoji ${reaction.emoji.name} detected`);

    // Things that act on reaction events
    this.quoteEventHandler.messageReactionHandler(reaction, guildMember);
  }
}

export const QuoteBot = new QuoteBotImpl();

export const QuoteBotDependency = new Dependency("QuoteBot");