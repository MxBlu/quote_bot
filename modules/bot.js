const { sendMessage } = require('../util/bot_utils');

const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const commandSyntax = /^\s*!([A-Za-z]+)((?: +[^ ]+)+)?\s*$/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  // Scrollable modal handler
  const scrollableManager = require('../util/scrollable')(discord, logger);

  // Command handlers
  const quoteEventHandler       = require('./command_handlers/quote_event')(discord, db, imm, logger);
  const quoteManagementHandler  = require('./command_handlers/quote_management')(discord, db, imm, logger, scrollableManager);

  const commandHandlers = {
    "help": helpHandler,
    "h": helpHandler,
    "listquotes": quoteManagementHandler.listquotesHandler,
    "lq": quoteManagementHandler.listquotesHandler,
    "dumpquotes": quoteManagementHandler.listquotesHandler,
    "getquote": quoteManagementHandler.getquoteHandler,
    "gq": quoteManagementHandler.getquoteHandler,
    "delquote": quoteManagementHandler.delquoteHandler,
    "dq": quoteManagementHandler.delquoteHandler,
    "reattrquote": quoteManagementHandler.reattrquoteHandler,
    "rq": quoteManagementHandler.reattrquoteHandler
  };

  // Discord event handlers

  function readyHandler() {
    logger.info("Discord connected", 1);

    // Call fetch on every guild to make sure we have all the members cached
    discord.guilds.cache.map(
      g => g.members.fetch().then(logger.info(`Cached members for ${g.id}`, 3))
    );
  }

  async function messageHandler(message) {
    // Ignore bot messages to avoid messy situations
    if (message.author.bot) {
      return;
    }

    const command = parseCommand(message);
    if (command != null) {
      logger.info(`Command received from '${message.author.username}' in '${message.guild.name}': ` +
          `!${command.command} - '${command.arguments.join(' ')}'`, 2);
      commandHandlers[command.command](command);
    }
    return;
  }

  function helpHandler(command) {
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
      "!getquote <filter> - Get a random quote from a given author\n" + 
      "!getquote <id> - Get a quote by given id\n" + 
      "!delquote <id> - Delete a quote by given id\n" +
      "!reattrquote <id> <user> - Reattribute a quote to a given user";

    sendMessage(command.message.channel, msg);
  }

  // Error handler

  async function errorLogHandler(topic, log) {
    if (!errLogDisabled) {
      try {
        // Should ensure that it works for DM channels too
        var targetChannel = await discord.channels.fetch(errStream);
        // Only send if we can access the error channel
        if (targetChannel != null) {
          sendMessage(targetChannel, log);
        }
      } catch (e) {
        console.error('Discord error log exception, disabling error log');
        console.error(e);
        errLogDisabled = true;
      }
    }
  }

  // Utility functions

  function parseCommand(cmdMessage) {
    // Compare against command syntax
    var matchObj = cmdMessage.content.match(commandSyntax);

    // Check if command is valid
    if (matchObj == null || !(matchObj[1].toLowerCase() in commandHandlers)) {
      return null;
    }

    // Remove double spaces from arg string, then split it into an array
    // If no args exist (matchObj[2] == null), create empty array
    let arguments = matchObj[2] ? matchObj[2].replace(/  +/g, ' ').trim().split(' ') : [];

    return {
      message: cmdMessage,
      command: matchObj[1].toLowerCase(),
      arguments: arguments
    };
  }

  discord.once('ready', readyHandler);
  discord.on('message', messageHandler);
  discord.on('messageReactionAdd', async (reaction, user) => {
    // Dumb ass shit cause Discord.js doesn't resolve them
    reaction = await reaction.fetch();
    user = await reaction.message.guild.members.fetch(user.id);

    logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 4);

    // Handlers
    quoteEventHandler.messageReactionHandler(reaction, user);
    scrollableManager.messageReactionHandler(reaction, user);
  });

  imm.subscribe('newErrorLog', errorLogHandler);
}