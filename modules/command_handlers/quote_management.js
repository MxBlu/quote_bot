const { MessageEmbed } = require("discord.js");
const { sendCmdMessage } = require("../../util/bot_utils");

module.exports = (discord, db, imm, logger) => {

  return {

    listquotesHandler: async (command) => {
      // 0 args - all from guild
      // 1 arg - either channel or user - all from channel/user filter by guild
      // 2 args - start from seq value given
      let guildId = command.message.guild.id;
      let quotes = null;
      let scope = '';

      switch (command.arguments.length) {
      case 0:
        // List all quotes from the guild
        quotes = await db.getQuotesByGuild(guildId).limit(10).exec();
        scope = "Guild";
        break;
      case 1:
      case 2:
        // Handle as quotes seq number start if first arg is numerical
        let start = 0;
        if (command.arguments[0].match(/^\d+$/)) {
          quotes = await db.getQuotesByGuild(guildId)
              .where('seq').gte(parseInt(command.arguments[0]))
              .limit(10).exec();
          break;
        } else if (command.arguments[1]?.match(/^\d+$/)) {
          start = parseInt(command.arguments[1]);
        }

        // Handle if first arg is a channel name or channel mention
        let potentialChannel = null;
        let channelRx = command.arguments[0].match(/^<#(\d+)>$/);
        if (channelRx != null) {
          potentialChannel = command.message.guild.channels.cache.get(channelRx[1]);
        } else {
          potentialChannel = command.message.guild.channels
              .cache.find(c => c.name === command.arguments[0]);
        }

        if (potentialChannel != null) {
          quotes = await db.getQuotesByChannel(potentialChannel.id)
              .where('seq').gte(start)
              .limit(10).exec();
          scope = `Channel #${potentialChannel.name} - From id ${start}`;
          break;
        }

        // Handle if first arg is a username or user nickname
        let potentialUser = null;
        let userRx = command.arguments[0].match(/^<@!(\d+)>$/);
        if (userRx != null) {
          potentialUser = command.message.guild.members.cache.get(userRx[1]);
        } else {
          potentialUser = command.message.guild.members
            .cache.find(m => m.nickname === command.arguments[0] || m.user.username === command.arguments[0]);
        }
        
        if (potentialUser != null) {
          quotes = await db.getQuotesByAuthor(potentialUser.id, guildId)
              .where('seq').gte(start)
              .limit(10).exec();
          user_name = potentialUser.nickname || potentialUser.user.username;
          scope = `Author @${user_name} - From id ${start}`;
          break;
        }
        break;
      default:
        sendCmdMessage(command.message, 'Error: too many arguments', 3, logger);
        return;
      }

      if (quotes === null || quotes.length == 0) {
        sendCmdMessage(command.message, 'No quotes found', 2, logger);
        return;
      }

      // Generate array of quote display lines
      let quoteStrings = [];
      for (let quote of quotes) {
        let author = await command.message.guild.members.fetch(quote.author);
        let quoter = await command.message.guild.members.fetch(quote.quoter);
        // Get nickname or username if not available
        const author_name = author.nickname || author.user.username;
        const quoter_name = quoter.nickname || quoter.user.username;
        quoteStrings.push(`${quote.seq}: [**${quoter_name}** quoted **${author_name}** (${quote.timestamp.toLocaleString()})](${quote.link})`);
      }

      // Create embed to display quotes
      let embed = new MessageEmbed()
          .setTitle(`Quotes - ${scope}`)
          .setDescription(quoteStrings.join("\n"))
      
      logger.info(`${command.message.author.username} listed quotes - ${scope}`, 2);
      command.message.channel.send(embed);
    },

    getquoteHandler: async (command) => {
      let guildId = command.message.guild.id;
      let quote = null;

      switch (command.arguments.length) {
      case 0:
        // Get random quote
        quote = await db.getRandomQuote(guildId);
        break;
      case 1:
        // Get quote with given seq ID
        try {
          quote = await db
              .getQuoteBySeq(guildId, parseInt(command.arguments[0])).exec();
        } catch (e) {
          sendCmdMessage(command.message, 'Error: invalid argument', 3, logger);
          return;
        }
        break;
      default:
        sendCmdMessage(command.message, 'Error: too many arguments', 3, logger);
        return;
      }

      if (quote === null) {
        sendCmdMessage(command.message, 'No quotes found', 2, logger);
        return;
      }

      let author = await command.message.guild.members.fetch(quote.author);
      let quoter = await command.message.guild.members.fetch(quote.quoter);
      // Get nickname or username if not available
      const author_name = author.nickname || author.user.username;
      const quoter_name = quoter.nickname || quoter.user.username;

      const messagePreamble = `**${quote.seq}**: **${quoter_name}** quoted **${author_name}**:`;
      const avatar_url = (author.user.avatar &&
        `https://cdn.discordapp.com/avatars/${author.id}/${author.user.avatar}.png`) ||
        author.user.defaultAvatarURL;
      let embed = new MessageEmbed()
          .setAuthor(author_name, avatar_url)
          .setDescription(quote.message)
          .setColor('RANDOM')
          .setTimestamp(quote.timestamp)
          .setImage(quote.img);

      logger.info(`${command.message.author.username} got quote { ${guildId} => ${quote.seq} }`, 2);
      command.message.channel.send(messagePreamble, embed);
    },

    delquoteHandler: async (command) => {
      let guildId = command.message.guild.id;
      switch (command.arguments.length) {
      case 1:
        // Delete quote with given seq ID
        try {
          quote = await db
              .delQuote(guildId, parseInt(command.arguments[0])).exec();
        } catch (e) {
          sendCmdMessage(command.message, 'Error: invalid argument', 3, logger);
          return;
        }
        break;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }

      sendCmdMessage(command.message, `Quote ${command.arguments[0]} deleted.`, 2, logger);
    }
    
  }
}
