const { MessageEmbed } = require("discord.js");
const { sendCmdMessage, stringEquivalence, stringSearch, isAdmin } = require("../../util/bot_utils");

module.exports = (discord, db, imm, logger, scrollable) => {

  // Generate quote display lines
  // - used in the modal hence why we're using a function
  async function generateQuoteMsgs(command, quotes) {
    // Generate array of quote display lines
    let quoteMsgs = [];
    for (let quote of quotes) {
      let author = await command.message.guild.members.fetch(quote.author);
      let quoter = await command.message.guild.members.fetch(quote.quoter);

      if (command.command === 'listquotes' || command.command === 'lq') {
        // Generate a list of quote links for 'listquotes'
        quoteMsgs.push(`${quote.seq}: [**${quoter.displayName}** quoted **${author.displayName}** ` +
                `(${quote.timestamp.toLocaleString()})](${quote.link})`);
      } else if (command.command === 'dumpquotes') {
        if (! await isAdmin(command.message)) {
          sendCmdMessage(command.message, 'Error: not admin', 2, logger);
          return;
        }
  
        // Generate a list of messages with content and embed
        quoteMsgs.push({
          content: `**${quote.seq}**: **${quoter.displayName}** quoted **${author.displayName}**:`,
          embed: new MessageEmbed()
              .setAuthor(author.displyName, author.user.displayAvatarURL())
              .setDescription(quote.message)
              .setColor('RANDOM')
              .setTimestamp(quote.timestamp)
              .setImage(quote.img)
        });
      }
    }

    return quoteMsgs;
  };

  return {

    listquotesHandler: async (command) => {
      let guildId = command.message.guild.id;
      let query = null; // Query to fulfil given criteria
      let scope = ''; // Scope of list query
      let start = 0; // Starting seq id

      switch (command.arguments.length) {
      case 0:
        // List all quotes from the guild
        query = db.getQuotesByGuild(guildId);
        scope = "Guild";
        break;
      case 1:
      case 2:
        // Handle as quotes seq number start if first arg is numerical
        if (command.arguments[0].match(/^\d+$/)) {
          start = parseInt(command.arguments[0]);
          query = db.getQuotesByGuild(guildId)
              .where('seq').gte(start);
          scope = "Guild";
          break;
        } else if (command.arguments[1]?.match(/^\d+$/)) {
          start = parseInt(command.arguments[1]);
        }

        // Handle if first arg may be a channel name or channel mention
        let potentialChannel = null;
        let channelRx = command.arguments[0].match(/^<#(\d+)>$/);
        if (channelRx != null) {
          potentialChannel = command.message.guild.channels.cache.get(channelRx[1]);
        } else {
          potentialChannel = command.message.guild.channels
              .cache.find(c => stringEquivalence(c.name, command.arguments[0]));
        }

        // If criteria passes, get all quotes for given channel
        if (potentialChannel != null) {
          query = db.getQuotesByChannel(potentialChannel.id)
              .where('seq').gte(start);
          scope = `Channel #${potentialChannel.name}`;
          break;
        }

        // Handle if first arg may be a username or user nickname
        let potentialUser = null;
        let userRx = command.arguments[0].match(/^<@!(\d+)>$/);
        if (userRx != null) {
          potentialUser = command.message.guild.members.cache.get(userRx[1]);
        } else {
          potentialUser = command.message.guild.members
            .cache.find(m => stringSearch(m.nickname, command.arguments[0]) || 
                          stringSearch(m.user.username, command.arguments[0]));
        }
        
        // If criteria passes, get all quotes for given user
        if (potentialUser != null) {
          query = db.getQuotesByAuthor(potentialUser.id, guildId)
              .where('seq').gte(start);
          scope = `Author @${potentialUser.displayName}`;
          break;
        }
        break;
      default:
        // If excessive arguments, send an error
        sendCmdMessage(command.message, 'Error: too many arguments', 3, logger);
        return;
      }

      // Couldn't match any criterias, so query is invalid
      if (query == null) {
        sendCmdMessage(command.message, 'Invalid query', 2, logger);
        return;
      }

      // Execute the query and get 10 quotes
      let quotes = await query.limit(10).exec();

      // If the result set is effectively empty, send a message indicating so
      if (quotes === null || quotes.length == 0) {
        sendCmdMessage(command.message, 'No quotes found', 2, logger);
        return;
      }

      // Generate a list of quote messages
      let quoteMsgs = await generateQuoteMsgs(command, quotes);

      // Append ID if the start value is set
      if (start > 0) {
        scope += ` - From id ${start}`;
      }

      if (command.command === 'listquotes' || command.command === 'lq') {
        // Create embed to display quotes
        let embed = new MessageEmbed()
            .setTitle(`Quotes - ${scope}`)
            .setDescription(quoteMsgs.join("\n"))
        
        logger.info(`${command.message.author.username} listed quotes - ${scope}`, 2);
        let message = await command.message.channel.send(embed);

        // Create scroll function handlers
        let leftHandler = async (modalProps, reaction, user) => {
          if (modalProps.skip == 0) {
            // Already left-most, loop around

            // Count total results in cloned query
            // The max number limit this is to bypass the limit value set prior
            let resCount = await query.model.find().merge(query)
                .limit(Number.MAX_SAFE_INTEGER).countDocuments();
            // Go to the next lowest value of 10 (ensuring we don't end up on the same value)
            modalProps.skip = (resCount - 1) - ((resCount - 1) % 10);
          } else {
            // Go back 10 results
            modalProps.skip -= 10;
          }

          // Cloned query with our new "skip" value
          quotes = await query.model.find().merge(query)
              .skip(modalProps.skip).limit(10).exec();
          
          // Convert new results into quote display lines
          quoteMsgs = await generateQuoteMsgs(command, quotes);
          
          // Modify original message with new quotes
          logger.info(`${user.user.username} navigated quote list - ${scope} skip ${modalProps.skip}`, 2);
          message.edit(new MessageEmbed()
              .setTitle(`Quotes - ${scope}`)
              .setDescription(quoteMsgs.join("\n"))
              .setFooter(modalProps.skip > 0 ? `+${modalProps.skip}` : ''));
        };

        let rightHandler = async (modalProps, reaction, user) => {
          // Go forward 10 results
          modalProps.skip += 10;

          // Cloned query with our new "skip" value
          quotes = await query.model.find().merge(query)
              .skip(modalProps.skip).limit(10).exec();

          if (quotes.length == 0) {
            // We've gone past the last page, reset
            modalProps.skip = 0;
            quotes = await query.model.find().merge(query)
                .skip(modalProps.skip).limit(10).exec();
          }
          
          // Convert new results into quote display lines
          quoteMsgs = await generateQuoteMsgs(command, quotes);
          
          // Modify original message with new quotes
          logger.info(`${user.user.username} navigated quote list - ${scope} skip ${modalProps.skip}`, 2);
          message.edit(new MessageEmbed()
              .setTitle(`Quotes - ${scope}`)
              .setDescription(quoteMsgs.join("\n"))
              .setFooter(modalProps.skip > 0 ? `+${modalProps.skip}` : ''));
        };
        
        // Create scrollable modal
        scrollable.addModal(message, {
          leftHandler: leftHandler,
          rightHandler: rightHandler,
          skip: 0
        });
      } else if (command.command === 'dumpquotes') {
        logger.info(`${command.message.author.username} dumped quotes - ${scope} - [ ${quotes.map(q => q.seq).join(', ')} ]`, 2);
        command.message.channel.send(`**${scope}** - ${quotes.length} quotes`);
        // Send every generated messaged
        for (msg of quoteMsgs) {
          command.message.channel.send(msg);
        }
      }
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
        // If first arg is a number
        // Get quote with given seq ID
        if (command.arguments[0].match(/^\d+$/)) {
          quote = await db
              .getQuoteBySeq(guildId, parseInt(command.arguments[0])).exec();
          break;
        }

        // Handle if first arg may be a username or user nickname
        let potentialUser = null;
        let userRx = command.arguments[0].match(/^<@!(\d+)>$/);
        if (userRx != null) {
          potentialUser = command.message.guild.members.cache.get(userRx[1]);
        } else {
          potentialUser = command.message.guild.members
            .cache.find(m => stringSearch(m.nickname, command.arguments[0]) || 
                          stringSearch(m.user.username, command.arguments[0]));
        }
        
        // If criteria passes, get all quotes for given user
        if (potentialUser != null) {
          quote = await db.getRandomQuoteFromAuthor(guildId, potentialUser.id);
          break;
        }
        break;
      default:
        // If excessive arguments, send an error
        sendCmdMessage(command.message, 'Error: too many arguments', 3, logger);
        return;
      }

      // If the quote is not found (either due to id not existing or no quotes in the db)
      // send a message indicating so
      if (quote === null) {
        sendCmdMessage(command.message, 'No quotes found', 2, logger);
        return;
      }

      // Get GuildMember objects for author and quoter
      let author = await command.message.guild.members.fetch(quote.author);
      let quoter = await command.message.guild.members.fetch(quote.quoter);

      // Re-generate quote from stored data
      const messagePreamble = `**${quote.seq}**: **${quoter.displayName}** quoted **${author.displayName}**:`;
      let embed = new MessageEmbed()
          .setAuthor(author.displayName, author.user.displayAvatarURL())
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
          // Attempt to delete quote with given id
          let res = await db
              .delQuote(guildId, parseInt(command.arguments[0])).exec();
          if (res.deletedCount != null && res.deletedCount > 0) {
            sendCmdMessage(command.message, `Quote ${command.arguments[0]} deleted.`, 2, logger);
            return;
          } else {
            sendCmdMessage(command.message, `Error: quote ${command.arguments[0]} doesn't exist`, 2, logger);
            return;
          }
        } catch (e) {
          sendCmdMessage(command.message, 'Error: invalid argument', 3, logger);
          return;
        }
        break;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }
    },

    reattrquoteHandler: async (command) => {
      if (! await isAdmin(command.message)) {
        sendCmdMessage(command.message, 'Error: not admin', 2, logger);
        return;
      }

      let guildId = command.message.guild.id;
      let newAuthor = null;
      let quote = null;
      switch (command.arguments.length) {
      case 2:
        // Reattribute a quote to a given user
        // Admin only
        try {
          let quoteId = parseInt(command.arguments[0]);
          
          // Get the user to reattribute to
          let userRx = command.arguments[1].match(/^<@!(\d+)>$/);
          if (userRx != null) {
            newAuthor = command.message.guild.members.cache.get(userRx[1]);
          } else {
            newAuthor = command.message.guild.members
              .cache.find(m => stringSearch(m.nickname, command.arguments[1]) || 
                            stringSearch(m.user.username, command.arguments[1]));
          }

          if (newAuthor == null) {
            sendCmdMessage(command.message, `Error: user does not exist`, 2, logger);
            return;
          }

          quote = await db.getQuoteBySeq(guildId, quoteId);
          if (quote == null) {
            sendCmdMessage(command.message, `Error: invalid quote ID`, 2, logger);
            return;
          }
        } catch (e) {
          sendCmdMessage(command.message, 'Error: invalid argument', 3, logger);
          return;
        }
        break;
      default:
        sendCmdMessage(command.message, 'Error: incorrect argument count', 3, logger);
        return;
      }

      // Update the author field and save to db
      quote.author = newAuthor.id;
      quote.save();
      sendCmdMessage(command.message, `Reattributed quote to ${newAuthor.displayName}`, 2, logger);
    }
    
  }
}
