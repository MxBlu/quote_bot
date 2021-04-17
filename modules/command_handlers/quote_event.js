const { MessageEmbed } = require("discord.js");
const { sendMessage, getBestGuildMember } = require("../../util/bot_utils");

const IMG_RX = /https?:\/\/[^\s]+\.(?:jpg|png)/i;

module.exports = (discord, db, imm, logger) => {

  // Create a quote embed
  function generateEmbed(message, author) {
    // Create embed content
    let content = `${message.content}\n`
                + `[Link](${message.url})`;

    // Create base embed
    const embed = new MessageEmbed()
        .setColor('RANDOM')
        .setTimestamp(message.createdAt)
        .setAuthor(author.displayName, author.user.displayAvatarURL());

    // If there's any images or attachments, add them to the embed
    // First check for an image URL in the contents
    let imgRegex = message.content.match(IMG_RX);
    if (imgRegex !== null) {
      embed.setImage(imgRegex[0]);
    }
    // Then add every attachment to the embed
    message.attachments.map(a => {
      // If we don't already have an image set
      // test if the current attachment is one and add if so
      if (embed.image === null) {
        imgRegex = a.url.match(IMG_RX);
        if (imgRegex !== null) {
          embed.setImage(imgRegex[0]);
          return;
        }
      }

      // If the attachment is not an image or
      // we already have one on the embed,
      // add it to the bottom of the content
      content += "\n\n" +
                  `**Attachment**: [${a.name}](${a.url})`;
    });
    
    // Set embed content
    embed.setDescription(content);
    return embed;
  }

  async function quoteHandler(message, quoter) {
    // Get GuildMember for given user
    const author = await getBestGuildMember(db, message.guild, message.author);

    // Create message to send
    const embed = generateEmbed(message, author);

    logger.info(`${quoter.user.username} quoted ${message.url}`, 2);
    
    // Send message with embed
    const messagePreamble = `**${quoter.displayName}** quoted **${author.displayName}**:`;
    message.channel.send(messagePreamble, embed);
  }

  async function quoteSaveHandler(message, quoter) {
    // Make sure the quote doesn't exist first
    if (await db.checkQuoteExists(message.url)) {
      logger.info(`${quoter.username} - ${message.guild.name} - Error: Quote already exists`, 2);
      sendMessage(message.channel, "Error: Quote already exists");
      return;
    }

    // Get GuildMember for given user
    const author = await getBestGuildMember(db, message.guild, message.author);

    // Create message to send
    const embed = generateEmbed(message, author);

    // Store quoted message to db
    let quote = await db.addQuote(message.guild.id, message.channel.id, author.id, quoter.id,
      embed.description, embed.image?.url, message.url, message.createdAt);

    logger.info(`${quoter.user.username} saved quote ${message.url}`, 2);
    
    // Send message with embed
    const messagePreamble = `${quote.seq}: **${quoter.displayName}** saved a quote by **${author.displayName}**:`;
    message.channel.send(messagePreamble, embed);
  }

	return {

    messageReactionHandler: async (reaction, user) => {
      // Handle emojis we care about
      // Remove reaction if we're handling em
      switch (reaction.emoji.name) {
      case "#️⃣":
        // Quote on hash react
        quoteHandler(reaction.message, user);
        reaction.remove();
        break;
      case "omegachair":
      case "♿":
        // Save on wheelchair react
        quoteSaveHandler(reaction.message, user);
        reaction.remove();
        break;
      }
    }

  }
}
