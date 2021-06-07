import { Message, Client as DiscordClient, TextChannel, MessageReaction, User, PartialUser } from "discord.js";
import { sendMessage } from "../util/bot_utils.js";
import { Logger, NewErrorLogTopic } from "../util/logger.js";
import { ScrollableModalManager } from "../util/scrollable.js";
import { Store } from "../util/store.js";
import { QuoteEventHandler } from "./command_handlers/quote_event.js";
import { QuoteManagementHandler } from "./command_handlers/quote_management.js";

const errStream: string = process.env.DISCORD_ERRSTREAM;

const commandSyntax = /^\s*!([A-Za-z]+)((?: +[^ ]+)+)?\s*$/;

type BotCommandHandlerFunction = (command: BotCommand) => Promise<void>;

export class BotCommand {
  message: Message;

  command: string;

  arguments: string[];
}

export class Bot {

  // Singleton instance
  private static _instance: Bot;

  // Create a Bot if one is not present
  public static ensure(discord: DiscordClient): void {
    if (this._instance == null) {
      this._instance = new Bot(discord);
    }
  }

  // Return singleton instance
  public static get(): Bot {
    return this._instance;
  }

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

  constructor(discord: DiscordClient) {
    this.discord = discord;
    this.errLogDisabled = false;
    this.scrollableManager = new ScrollableModalManager(discord);
    this.logger = new Logger("Bot");

    this.commandHandlers = new Map<string, BotCommandHandlerFunction>();
    this.initCommandHandlers();
    this.initDiscordEventHandlers();

    // Subscribe to error handler topic to post them to discord
    NewErrorLogTopic.subscribe("errorLogHandler", this.errorLogHandler);
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

  private initDiscordEventHandlers(): void {
    this.discord.once('ready', this.readyHandler);
    this.discord.on('message', this.messageHandler);
    this.discord.on('messageReactionAdd', this.reactionHandler);
    this.discord.on('guildMemberAdd', this.memberUpdateHandler);
    this.discord.on('guildMemberUpdate', (_, m) => this.memberUpdateHandler(m)); // ignore 'old member' param
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
    this.logger.info("Discord connected", 1);

    // Call fetch on every guild to make sure we have all the members cached
    this.discord.guilds.cache.map(
      g => g.members.fetch()
          .then(c => c.map(m => this.memberUpdateHandler(m)))
          .then(() => this.logger.info(`Cached members for ${g.id}`, 3))
    );
  }

  private memberUpdateHandler = async (member) => {
    Store.upsertUser(member.id, member.guild.id, member.displayName, member.user.discriminator);
    this.logger.info(`Updated member '${member.displayName}' for guild '${member.guild.name}`, 4);
  }

  private messageHandler = async (message: Message): Promise<void> => {
    // Ignore bot messages to avoid messy situations
    if (message.author.bot) {
      return;
    }

    const command = this.parseCommand(message);
    if (command != null) {
      this.logger.info(`Command received from '${message.author.username}' in '${message.guild.name}': ` +
          `!${command.command} - '${command.arguments.join(' ')}'`, 2);
      this.commandHandlers.get(command.command)(command);
    }
  }

  private reactionHandler = async (reaction: MessageReaction, user: User | PartialUser): Promise<void> => {
    // Dumb ass shit cause Discord.js doesn't resolve them
    reaction = await reaction.fetch();
    const guildMember = await reaction.message.guild.members.fetch(user.id);

    this.logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 4);

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