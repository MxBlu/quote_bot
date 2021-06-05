import { Message, Client as DiscordClient, TextChannel } from "discord.js";
import { sendMessage } from "../util/bot_utils.js";
import { MessengerTopic } from "../util/imm.js";
import { Logger, NewErrorLogTopic } from "../util/logger.js";
import { QuoteEventHandler } from "./command_handlers/quote_event.js";
import { QuoteManagementHandler } from "./command_handlers/quote_management.js";

const errStream: string = process.env.DISCORD_ERRSTREAM;

const commandSyntax = /^\s*!([A-Za-z]+)((?: [^ ]+)+)?\s*$/;

type BotCommandHandlerFunction = (command: BotCommand) => Promise<void>;

export class BotCommand {
  message: Message;

  command: string;

  arguments: string[];
}

export class Bot {
  discord: DiscordClient;
  
  logger: Logger;

  // For when we hit an error logging to Discord itself
  errLogDisabled: boolean;

  commandHandlers: Map<string, BotCommandHandlerFunction>;

  // Command handlers
  quoteEventHandler: QuoteEventHandler;
  quoteManagementHandler: QuoteManagementHandler;

  constructor(discord: DiscordClient) {
    this.discord = discord;
    this.errLogDisabled = false;
    this.logger = new Logger("Bot");

    this.commandHandlers = new Map<string, BotCommandHandlerFunction>();
    this.initCommandHandlers();
    this.initDiscordEventHandlers();

    // Subscribe to error handler topic to post them to discord
    NewErrorLogTopic.subscribe(this.errorLogHandler);
  }

  private initCommandHandlers(): void {
    this.quoteEventHandler =  new QuoteEventHandler(this.discord);
    this.quoteManagementHandler = new QuoteManagementHandler();

    this.commandHandlers.set("help", this.helpHandler);
    this.commandHandlers.set("listquotes", this.quoteManagementHandler.listquotesHandler);
    this.commandHandlers.set("dumpquotes", this.quoteManagementHandler.listquotesHandler);
    this.commandHandlers.set("getquote", this.quoteManagementHandler.getquoteHandler);
    this.commandHandlers.set("delquote", this.quoteManagementHandler.delquoteHandler);
  }

  private initDiscordEventHandlers(): void {
    this.discord.once('ready', this.readyHandler);
    this.discord.on('message', this.messageHandler);
    this.discord.on('messageReactionAdd', this.quoteEventHandler.messageReactionHandler);
  }

  // Discord event handlers

  private readyHandler(): void {
    this.logger.info("Discord connected", 1);

    // Call fetch on every guild to make sure we have all the members cached
    this.discord.guilds.cache.map(
      g => g.members.fetch().then(() => this.logger.info(`Cached members for ${g.id}`, 3))
    );
  }

  private async messageHandler(message: Message) {
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

  private async helpHandler(command: BotCommand): Promise<void> {
    if (command.arguments == null ||
          command.arguments[0] !== "quotebot") {
      // Only send help for !help quotebot
      return;
    }

    let msg = 
      "Quote Bot v2 - Quote and save messages\n" + 
      "\n" + 
      "Add a #️⃣ react to a message to quote the message\n" + 
      "Add a ♿ or :omegaChair: emote to save a quote\n" + 
      "\n" + 
      "!listquotes [<id start>] - Get quotes from this guild, optionally starting from <id start>\n" + 
      "!listquotes <filter> [<id start>] - Get quotes from a given channel or author, optionally starting from <id start>\n" + 
      "!dumpquotes <filter> [<id start>] - Takes the same args as listquotes, except displays all the quotes\n" +
      "!getquote - Get a random quote\n" + 
      "!getquote <id> - Get a quote by given id\n" + 
      "!delquote <id> - Delete a quote by given id";

    sendMessage(command.message.channel, msg);
  }

  // Error handler

  private async errorLogHandler(data: any, topic: MessengerTopic): Promise<void> {
    // Log message
    let log: string = data;

    if (!this.errLogDisabled) {
      try {
        // Should ensure that it works for DM channels too
        let targetChannel = await this.discord.channels.fetch(errStream);
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

  // Utility functions

  private parseCommand(cmdMessage: Message): BotCommand {
    // Compare against command syntax
    var matchObj = cmdMessage.content.match(commandSyntax);

    // Check if command is valid
    if (matchObj == null || !this.commandHandlers.has(matchObj[1])) {
      return null;
    }

    let command = new BotCommand();
    command.message = cmdMessage;
    command.command = matchObj[1];
    command.arguments = matchObj[2] ? matchObj[2].trim().split(' ') : [];

    return command;
  }

}