import { MessageEmbed, Client as DiscordClient, MessageReaction, GuildMember, Message, User, PartialUser } from "discord.js";
import { Logger } from "../../util/logger.js";
import { Store } from "../../util/store.js";

const IMG_RX = /https?:\/\/[^\s]+\.(?:jpg|png)/i;

export class QuoteEventHandler {
  discord: DiscordClient;

  logger: Logger;

  constructor(discord: DiscordClient) {
    this.discord = discord;
    this.logger = new Logger("QuoteEventHandler");
  }

  public messageReactionHandler = async (reaction: MessageReaction, user: User | PartialUser): Promise<void> => {
    // Dumb ass shit cause Discord.js doesn't resolve them
    reaction = await reaction.fetch();
    const guildUser = await reaction.message.guild.members.fetch(user.id);

    this.logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 4);
    // Handle emojis we care about
    // Remove reaction if we're handling em
    switch (reaction.emoji.name) {
    case "#️⃣":
      // Quote on hash react
      this.quoteHandler(reaction.message, guildUser);
      reaction.remove();
      break;
    case "omegachair":
    case "♿":
      // Save on wheelchair react
      this.quoteSaveHandler(reaction.message, guildUser);
      reaction.remove();
      break;
    }
  }

  // Create a quote embed
  private generateEmbed(message: Message, author: GuildMember): MessageEmbed {
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

  private quoteHandler = async(message: Message, quoter: GuildMember): Promise<void> => {
    // Properly resolve guild members from message author
    // I think it's a discord.js issue
    const author = await message.guild.members.fetch(message.author.id);

    // Get nickname or username if not available
    const author_name = author.nickname || author.user.username;
    const quoter_name = quoter.nickname || quoter.user.username;  

    // Create message to send
    const messagePreamble = `**${quoter_name}** quoted **${author_name}**:`;
    const embed = this.generateEmbed(message, author);

    this.logger.info(`${quoter_name} quoted ${message.url}`, 2);
    
    // Send message with embed
    message.channel.send(messagePreamble, embed);
  }

  private quoteSaveHandler = async (message: Message, quoter: GuildMember): Promise<void> => {
    // Properly resolve guild members from message author
    // I think it's a discord.js issue
    const author = await message.guild.members.fetch(message.author.id);

    // Get nickname or username if not available
    const author_name = author.nickname || author.user.username;
    const quoter_name = quoter.nickname || quoter.user.username;

    // Create message to send
    const messagePreamble = `**${quoter_name}** saved quote a by **${author_name}**:`;
    const embed = this.generateEmbed(message, author);

    // Store quoted message to db
    await Store.get().addQuote(message.guild.id, message.channel.id, author.id, quoter.id,
      embed.description, embed.image?.url, message.url, message.createdAt);

    this.logger.info(`${quoter_name} saved quote ${message.url}`, 2);
    
    // Send message with embed
    message.channel.send(messagePreamble, embed);
  }
}