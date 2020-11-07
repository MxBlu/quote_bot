
const MessageEmbed = require('discord.js').MessageEmbed;

const IMG_RX = /https?:\/\/[^\s]+\.(?:jpg|png)/i;

module.exports = (discord, db, imm, logger) => {

  async function quoteHandler(reaction, quoter) {
    const message = reaction.message;
    const author = await message.guild.members.fetch(message.author.id);
    const quoterResolved = await message.guild.members.fetch(quoter.id);

    const author_name = author.nickname || author.user.username;
    const quoter_name = quoterResolved.nickname || quoterResolved.user.username;
    const avatar_url = (author.user.avatar &&
        `https://cdn.discordapp.com/avatars/${author.id}/${author.user.avatar}.png`) ||
        author.user.defaultAvatarURL;

    const messagePreamble = `**${quoter_name}** quoted **${author_name}**:`;
    let content = `${message.content}\n`
                + `[Link](${message.url})`;

    const embed = new MessageEmbed()
        .setColor('RANDOM')
        .setTimestamp(message.createdAt)
        .setAuthor(author.nickname || author.user.username, avatar_url);

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
    
    embed.setDescription(content);
    message.channel.send(messagePreamble, embed);
    reaction.remove();
  }

	return {
    // If the message has a '#' emoji, treat it as a reaction
    messageReactionHandler: async (reaction, user) => {
      // Dumb ass shit cause Discord.js doesn't resolve them
      reaction = await reaction.fetch();
      user = await user.fetch();

      logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 3);
      // Quote on hash react
      if (reaction.emoji.name === "#️⃣") {
        quoteHandler(reaction, user);
      }
    }
  }
}
