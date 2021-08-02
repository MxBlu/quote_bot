import { BaseBot } from "bot-framework";
import { MessageReaction, User, PartialUser, IntentsString } from "discord.js";


import { Store, StoreDependency } from "../support/store.js";
import { QuoteEventHandler } from "../events/quote_event.js";
import { QuoteManagementHandler } from "../commands/quote_management.js";

export class QuoteBotImpl extends BaseBot {

  // Command handlers
  quoteEventHandler: QuoteEventHandler;

  constructor() {
    super("QuoteBot");
  }

  public async init(discordToken: string): Promise<void> {
    // Wait on Store to be ready
    await StoreDependency.await();

    // Choose what gateway intents we want to receive
    const intents: IntentsString[] = [
      "GUILDS",
      "GUILD_MESSAGES",
      "GUILD_MEMBERS",
      "GUILD_MESSAGE_REACTIONS",
    ];
    
    // Without partials, we would not get certain events
    super.init(discordToken, intents, { 
      partials: [ 'GUILD_MEMBER', 'MESSAGE', 'REACTION' ] 
    });
  }

  public loadInterfaces(): void {
    this.interfaces.push(new QuoteManagementHandler());
  }
  
  public initCustomEventHandlers(): void {
    this.quoteEventHandler =  new QuoteEventHandler();

    this.discord.on('messageReactionAdd', this.reactionHandler);
    this.discord.on('guildMemberAdd', this.memberUpdateHandler);
    this.discord.on('guildMemberUpdate', (_, m) => this.memberUpdateHandler(m)); // ignore 'old member' param
  }

  // Discord event handlers

  public async onReady(): Promise<void> {
    // Call fetch on every guild to make sure we have all the members cached
    this.discord.guilds.cache.map(
      g => g.members.fetch()
          .then(c => c.map(m => this.memberUpdateHandler(m)))
          .then(() => this.logger.debug(`Cached members for ${g.id}`))
    );
  }

  private memberUpdateHandler = async (member) => {
    // Store member data in DB
    Store.upsertUser(member.id, member.guild.id, member.displayName, member.user.discriminator);
    this.logger.trace(`Updated member '${member.displayName}' for guild '${member.guild.name}'`);
  }

  private reactionHandler = async (reaction: MessageReaction, user: User | PartialUser): Promise<void> => {
    // Dumb ass shit cause Discord.js doesn't resolve them
    reaction = await reaction.fetch();
    const guildMember = await reaction.message.guild.members.fetch(user.id);

    this.logger.trace(`Reaction with emoji ${reaction.emoji.name} detected`);

    // Things that act on reaction events
    this.quoteEventHandler.messageReactionHandler(reaction, guildMember);
  }

  public getHelpMessage(): string {
    const msg = 
      "Quote Bot v2 - Quote and save messages\n" + 
      "\n" + 
      "Add a #️⃣ react to a message to quote the message\n" + 
      "Add a ♿ or :omegaChair: emote to save a quote\n" + 
      "\n" + 
      "!listquotes [<id start>] - Get quotes from this guild, optionally starting from <id start>\n" + 
      "!listquotes <filter> [<id start>] - Get quotes from a given channel or author, optionally starting from <id start>\n" + 
      "!getquote - Get a random quote\n" + 
      "!getquote <filter> - Get a random quote from a given author\n" + 
      "!getquote <id> - Get a quote by given id\n" + 
      "!delquote <id> - Delete a quote by given id\n" +
      "!reattrquote <id> <user> - Reattribute a quote to a given user";

    return msg;
  }
}

export const QuoteBot = new QuoteBotImpl();