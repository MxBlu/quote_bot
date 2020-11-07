
const MessageEmbed = require('discord.js').MessageEmbed;

const IMG_RX = /https?:\/\/[^\s]+\.(?:jpg|png)/i;

module.exports = (discord, db, imm, logger) => {

  // Create a quote embed
  function generateEmbed(message, author) {
    // Generate avatar URL
    const avatar_url = (author.user.avatar &&
        `https://cdn.discordapp.com/avatars/${author.id}/${author.user.avatar}.png`) ||
        author.user.defaultAvatarURL;
    let content = `${message.content}\n`
                + `[Link](${message.url})`;

    // Create base embed
    const embed = new MessageEmbed()
        .setColor('RANDOM')
        .setTimestamp(message.createdAt)
        .setAuthor(author.nickname || author.user.username, avatar_url);

    // If there's any images or attachments, add them to the embed
    let imgRegex = message.content.match(IMG_RX);
    if (imgRegex !== null) {
      embed.setImage(imgRegex[0]);
    }
    message.attachments.map(a => {
      if (embed.image === null) {
        imgRegex = a.url.match(IMG_RX);
        if (imgRegex !== null) {
          embed.setImage(imgRegex[0]);
          return;
        }
      }

      content += "\n\n" +
                  `**Attachment**: [${a.name}](${a.url})`;
    });
    
    // Set embed content
    embed.setDescription(content);
    return embed;
  }

  async function quoteHandler(reaction, quoter) {
    // Properly resolve guild members from message author
    // I think it's a discord.js issue
    const message = reaction.message;
    const author = await message.guild.members.fetch(message.author.id);
    const quoterResolved = await message.guild.members.fetch(quoter.id);

    // Get nickname or username if not available
    const author_name = author.nickname || author.user.username;
    const quoter_name = quoterResolved.nickname || quoterResolved.user.username;

    // Create message to send
    const messagePreamble = `**${quoter_name}** quoted **${author_name}**:`;
    const embed = generateEmbed(message, author);

    logger.info(`${quoter_name} quoted ${message.url}`, 2);
    
    // Send message with embed and remove reaction
    message.channel.send(messagePreamble, embed);
    reaction.remove();
  }

	return {

    messageReactionHandler: async (reaction, user) => {
      // Dumb ass shit cause Discord.js doesn't resolve them
      reaction = await reaction.fetch();
      user = await user.fetch();

      logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 4);
      switch (reaction.emoji.name) {
      case "#️⃣":
        // Quote on hash react
        quoteHandler(reaction, user);
        break;
      case "♿":
        break;
      }
    }

  }
}
