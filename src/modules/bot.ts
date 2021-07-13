import { Logger, NewLogEmitter, ScrollableModalManager, sendMessage } from "bot-framework";
import { Message, Client as DiscordClient, TextChannel, MessageReaction, User, PartialUser } from "discord.js";


import { Store, StoreDependency } from "../support/store.js";
import { QuoteEventHandler } from "../commands/quote_event.js";
import { QuoteManagementHandler } from "../commands/quote_management.js";
import { LogLevels } from "@typegoose/typegoose";

const errStream: string = process.env.DISCORD_ERRSTREAM;

const commandSyntax = /^\s*!([A-Za-z]+)((?: +[^ ]+)+)?\s*$/;

type BotCommandHandlerFunction = (command: BotCommand) => Promise<void>;

export class BotCommand {
  message: Message;

  command: string;

  arguments: string[];
}

export class BotImpl {

  discord: DiscordClient;
  
  logger: Logger;

  // For when we hit an error logging to Discord itself
  errLogDisabled: boolean;
  // Manager for scrolling modals
  scrollableManager: ScrollableModalManager;
  // Map of command names to handlers
  commandHandlers: Map<string, BotCommandHandlerFunction>;

  // Command handlers
  quoteEventHandler: QuoteEventHandler;
  quoteManagementHandler: QuoteManagementHandler;

  constructor() {
    this.errLogDisabled = false;
    this.logger = new Logger("Bot");
    this.commandHandlers = new Map<string, BotCommandHandlerFunction>();
  }

  public async init(discordToken: string): Promise<void> {
    // Without partials, we would not get certain events
    this.discord = new DiscordClient({ partials: [ 'GUILD_MEMBER', 'MESSAGE', 'REACTION' ] });
    this.scrollableManager = new ScrollableModalManager(this.discord);

    // Wait on Store to be ready
    await StoreDependency.await();

    this.initCommandHandlers();
    this.initEventHandlers();
    
    this.discord.login(discordToken);
  }

  private initCommandHandlers(): void {
    this.quoteEventHandler =  new QuoteEventHandler();
    this.quoteManagementHandler = new QuoteManagementHandler(this.scrollableManager);

    this.commandHandlers.set("help", this.helpHandler);
    this.commandHandlers.set("h", this.helpHandler);
    this.commandHandlers.set("listquotes", this.quoteManagementHandler.listquotesHandler);
    this.commandHandlers.set("lq", this.quoteManagementHandler.listquotesHandler);
    this.commandHandlers.set("getquote", this.quoteManagementHandler.getquoteHandler);
    this.commandHandlers.set("gq", this.quoteManagementHandler.getquoteHandler);
    this.commandHandlers.set("delquote", this.quoteManagementHandler.delquoteHandler);
    this.commandHandlers.set("dq", this.quoteManagementHandler.delquoteHandler);
    this.commandHandlers.set("reattrquote", this.quoteManagementHandler.reattrquoteHandler);
    this.commandHandlers.set("rq", this.quoteManagementHandler.reattrquoteHandler);
  }

  private initEventHandlers(): void {
    this.discord.once('ready', this.readyHandler);
    this.discord.on('message', this.messageHandler);
    this.discord.on('messageReactionAdd', this.reactionHandler);
    this.discord.on('guildMemberAdd', this.memberUpdateHandler);
    this.discord.on('guildMemberUpdate', (_, m) => this.memberUpdateHandler(m)); // ignore 'old member' param
    
    // Subscribe to error handler topic to post them to discord
    NewLogEmitter.on(LogLevels[LogLevels.ERROR], this.errorLogHandler);
  }

  // Utility functions

  private parseCommand(cmdMessage: Message): BotCommand {
    // Compare against command syntax
    const matchObj = cmdMessage.content.match(commandSyntax);

    // Check if command is valid
    if (matchObj == null || !this.commandHandlers.has(matchObj[1].toLowerCase())) {
      return null;
    }

    // Remove double spaces from arg string, then split it into an array
    // If no args exist (matchObj[2] == null), create empty array
    const cmdArgs = matchObj[2] ? matchObj[2].replace(/  +/g, ' ').trim().split(' ') : [];

    const command = new BotCommand();
    command.message = cmdMessage;
    command.command = matchObj[1].toLowerCase();
    command.arguments = cmdArgs;

    return command;
  }

  // Discord event handlers

  private readyHandler = (): void => {
    this.logger.info("Discord connected");

    // Call fetch on every guild to make sure we have all the members cached
    this.discord.guilds.cache.map(
      g => g.members.fetch()
          .then(c => c.map(m => this.memberUpdateHandler(m)))
          .then(() => this.logger.debug(`Cached members for ${g.id}`))
    );
  }

  private memberUpdateHandler = async (member) => {
    Store.upsertUser(member.id, member.guild.id, member.displayName, member.user.discriminator);
    this.logger.trace(`Updated member '${member.displayName}' for guild '${member.guild.name}'`);
  }

  private messageHandler = async (message: Message): Promise<void> => {
    // Ignore bot messages to avoid messy situations
    if (message.author.bot) {
      return;
    }

    const command = this.parseCommand(message);
    if (command != null) {
      this.logger.debug(`Command received from '${message.author.username}' in '${message.guild.name}': ` +
          `!${command.command} - '${command.arguments.join(' ')}'`);
      this.commandHandlers.get(command.command)(command);
    }
  }

  private reactionHandler = async (reaction: MessageReaction, user: User | PartialUser): Promise<void> => {
    // Dumb ass shit cause Discord.js doesn't resolve them
    reaction = await reaction.fetch();
    const guildMember = await reaction.message.guild.members.fetch(user.id);

    this.logger.trace(`Reaction with emoji ${reaction.emoji.name} detected`);

    // Handlers
    this.quoteEventHandler.messageReactionHandler(reaction, guildMember);
    this.scrollableManager.messageReactionHandler(reaction, guildMember);
  }

  private helpHandler = async (command: BotCommand): Promise<void> => {
    if (command.arguments == null ||
          command.arguments[0] !== "quotebot") {
      // Only send help for !help quotebot
      return;
    }

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

    sendMessage(command.message.channel, msg);
  }

  // Error handler

  private errorLogHandler = async (data): Promise<void> => {
    // Log message
    const log: string = data;

    if (!this.errLogDisabled) {
      try {
        // Should ensure that it works for DM channels too
        const targetChannel = await this.discord.channels.fetch(errStream);
        // Only send if we can access the error channel
        if (targetChannel != null && targetChannel instanceof TextChannel) {
          sendMessage(targetChannel, log);
        }
      } catch (e) {
        console.error('Discord error log exception, disabling error log');
        console.error(e);
        this.errLogDisabled = true;
      }
    }
  }

}

export const Bot = new BotImpl();