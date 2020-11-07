const errGuild = process.env.DISCORD_ERRGUILD;
const errStream = process.env.DISCORD_ERRSTREAM;
const adminUser = process.env.DISCORD_ADMINUSER;

const DISCORD_MAX_LEN = 1900;

const commandSyntax = /^\s*!([A-Za-z]+)((?: [^ ]+)+)?\s*$/;

module.exports = (discord, db, imm, logger) => {

  var errLogDisabled = false;

  const quoteEventHandler       = require('./command_handlers/quote_event')(discord, db, imm, logger);
  const quoteManagementHandler  = require('./command_handlers/quote_management')(discord, db, imm, logger);

  const commandHandlers = {
    "listquotes": quoteManagementHandler.listquotesHandler,
    "getquote": quoteManagementHandler.getquoteHandler,
    "delquote": quoteManagementHandler.delquoteHandler
  };

  // Discord event handlers

  function readyHandler() {
    logger.info("Discord connected", 1);
    
    // Cache guilds
    let guilds = discord.guilds.cache.map(g => g.id);
    db.addGuilds(...guilds);

    // Cache channels
    discord.guilds.cache.map(g => 
      g.channels.cache.filter(c => c.type === 'text').map(c => 
        db.addChannel(g.id, c.id, c.name)
      )
    );
  }

  function joinServerHandler(guild) {
    logger.info(`Joined guild: ${guild.name}`, 2);
    db.addGuilds(guild.id);

    // Cache channels
    discord.guilds.cache.map(g => 
      g.channels.cache.filter(c => c.type === 'text').map(c => 
        db.addChannel(g.id, c.id, c.name)
      )
    );
  }

  function leaveServerHandler(guild) {
    logger.info(`Left guild: ${guild.name}`, 2);
    db.removeGuild(guild.id);
  }

  function channelCreateHandler(channel) {
    if (channel.type === 'text') {
      db.addChannel(channel.guild.id, channel.id, channel.name);
    }
  }

  function channelUpdateHandler(oldChannel, newChannel) {
    if (newChannel.type === 'text') {
      db.addChannel(newChannel.guild.id, newChannel.id, newChannel.name);
    }
  }

  function channelDeleteHandler(channel) {
    if (channel.type === 'text') {
      db.delChannel(channel.guild.id, channel.id);
    }
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

  function chunkString(str) {
    let chunks = [];
    let strBuffer = '';

    // Split by newline and concat strings until ideal length
    // Then add so chunks list
    str.split("\n").forEach(s => {
      // A single oversized string, chunk by length
      if (s.length > DISCORD_MAX_LEN) {
        // Flush buffer as a chunk if there's any
        if (strBuffer.length > 0) {
          chunks.push(strBuffer);
          strBuffer = '';
        }
        for (let i = 0; i < s.length; i += DISCORD_MAX_LEN) {
          chunks.push(s.substr(i, DISCORD_MAX_LEN));
        }
      // Adding the current string would cause it to go oversized
      // Add the current buffer as a chunk, then set the buffer 
      //   to the current str
      } else if (strBuffer.length + s.length + 1 > DISCORD_MAX_LEN) {
        chunks.push(strBuffer);
        strBuffer = s + "\n";
      // Otherwise, add the string the the buffer
      } else {
        strBuffer += s + "\n";
      }
    });

    // Flush the buffer again
    if (strBuffer.length > 0) {
      chunks.push(strBuffer);
      strBuffer = '';
    }

    return chunks;
  }

  function sendMessage(targetChannel, msg) {
    var msgChunks = chunkString(msg, DISCORD_MAX_LEN);
    msgChunks.forEach(
      (chunk) => targetChannel.send(chunk));
  }

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
  discord.on('guildCreate', joinServerHandler);
  discord.on('guildDelete', leaveServerHandler);
  discord.on('channelCreate', channelCreateHandler);
  discord.on('channelDelete', channelDeleteHandler);
  discord.on('channelUpdate', channelUpdateHandler);
  discord.on('messageReactionAdd', quoteEventHandler.messageReactionHandler);

  imm.subscribe('newErrorLog', errorLogHandler);
}