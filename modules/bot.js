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

  };

  // Discord event handlers

  function readyHandler() {
    logger.info("Discord connected", 1);
    
    // Cache guilds
    let guilds = discord.guilds.map(g => g.id);
    db.addGuilds(...guilds);

    // Cache channels
    discord.guilds.every(g => 
      g.channels.filter(c => c.type === 'text').every(c => 
        db.addChannel(g.id, c.id, c.name)
      )
    );
  }

  function joinServerHandler(guild) {
    logger.info(`Joined guild: ${guild.name}`, 2);
    db.addGuilds(guild.id);

    // Cache channels
    discord.guilds.every(g => 
      g.channels.filter(c => c.type === 'text').every(c => 
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
    if (channel.type === 'text') {
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

  function errorLogHandler(topic, log) {
    if (!errLogDisabled) {
      try {
        var targetChannel = discord.guilds.get(errGuild).channels.get(errStream);
        sendMessage(targetChannel, log);
      } catch (e) {
        console.error('Discord error log exception, disabling error log');
        console.error(e);
        errLogDisabled = true;
      }
    }
  }

  // Utility functions

  function chunkString(str, len) {
    const size = Math.ceil(str.length/len);
    const r = Array(size);
    let offset = 0;
    
    for (let i = 0; i < size; i++) {
      r[i] = str.substr(offset, len);
      offset += len;
    }
    
    return r;
  }

  function sendMessage(targetChannel, msg) {
    var msgChunks = chunkString(msg, DISCORD_MAX_LEN);
    for (var i = 0; i < msgChunks.length; i++){
      targetChannel.send(msgChunks[i]);
    }
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
  discord.on('messageReactionAdd', quoteEventHandler.quoteEventHandler);

  imm.subscribe('newErrorLog', errorLogHandler);
}