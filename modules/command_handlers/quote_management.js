const { MessageEmbed } = require("discord.js");
const { sendCmdMessage } = require("../../util/bot_utils");

module.exports = (discord, db, imm, logger) => {

  return {

    listquotesHandler: async (command) => {
      // 0 args - all from guild
      // 1 arg - either channel or user - all from channel/user filter by guild
      // 2 args - start from seq value given
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
