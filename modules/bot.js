const { sendMessage } = require('../util/bot_utils');

const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const commandSyntax = /^\s*!([A-Za-z]+)((?: [^ ]+)+)?\s*$/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  // Command handlers
  const quoteEventHandler       = require('./command_handlers/quote_event')(discord, db, imm, logger);
  const quoteManagementHandler  = require('./command_handlers/quote_management')(discord, db, imm, logger);

  const commandHandlers = {
    "help": helpHandler,
    "listquotes": quoteManagementHandler.listquotesHandler,
    "getquote": quoteManagementHandler.getquoteHandler,
    "delquote": quoteManagementHandler.delquoteHandler
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
      "!getquote - Get a random quote\n" + 
      "!getquote <id> - Get a quote by given id\n" + 
      "!delquote <id> - Delete a quote by given id";

    sendMessage(command.message.channel, msg);
  }

  // Error handler

  async function errorLogHandler(topic, log) {
    if (!errLogDisabled) {
      try {
        // Should ensure that it works for DM channels too
        var targetChannel = await discord.channels.fetch(errStream);
        sendMessage(targetChannel, log);
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
    if (matchObj == null || !(matchObj[1] in commandHandlers)) {
      return null;
    }

    return {
      message: cmdMessage,
      command: matchObj[1],
      arguments: matchObj[2] ? matchObj[2].trim().split(' ') : []
    };
  }

  discord.once('ready', readyHandler);
  discord.on('message', messageHandler);
  discord.on('messageReactionAdd', quoteEventHandler.messageReactionHandler);

  imm.subscribe('newErrorLog', errorLogHandler);
}