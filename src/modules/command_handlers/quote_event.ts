import { MessageEmbed, Client as DiscordClient, MessageReaction, GuildMember, Message } from "discord.js";
import { sendMessage } from "../../util/bot_utils.js";
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

  public messageReactionHandler = async (reaction: MessageReaction, user: GuildMember): Promise<void> => {
    // Handle emojis we care about
    // Remove reaction if we're handling em
    switch (reaction.emoji.name) {
    case "#️⃣":
      // Quote on hash react
      this.quoteHandler(reaction.message, user);
      reaction.remove();
      break;
    case "omegachair":
    case "♿":
      // Save on wheelchair react
      this.quoteSaveHandler(reaction.message, user);
      reaction.remove();
      break;
    }
  }

  // Create a quote embed
  private generateEmbed(message: Message, author: GuildMember): MessageEmbed {
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

  private quoteHandler = async(message: Message, quoter: GuildMember): Promise<void> => {
    // Properly resolve guild members from message author
    // I think it's a discord.js issue
    const author = await message.guild.members.fetch(message.author.id);

    // Create message to send
    const embed = this.generateEmbed(message, author);

    this.logger.info(`${quoter.user.username} quoted ${message.url}`, 2);
    
    // Send message with embed
    const messagePreamble = `**${quoter.displayName}** quoted **${author.displayName}**:`;
    message.channel.send(messagePreamble, embed);
  }

  private quoteSaveHandler = async (message: Message, quoter: GuildMember): Promise<void> => {
    // Make sure the quote doesn't exist first
    if (await Store.get().checkQuoteExists(message.url)) {
      this.logger.info(`${quoter.user.username} - ${message.guild.name} - Error: Quote already exists`, 2);
      sendMessage(message.channel, "Error: Quote already exists");
      return;
    }

    // Properly resolve guild members from message author
    // I think it's a discord.js issue
    const author = await message.guild.members.fetch(message.author.id);

    // Create message to send
    const embed = this.generateEmbed(message, author);

    // Store quoted message to db
    const quote = await Store.get().addQuote(message.guild.id, message.channel.id, author.id, quoter.id,
      embed.description, embed.image?.url, message.url, message.createdAt);

    this.logger.info(`${quoter.user.username} saved quote ${message.url}`, 2);
    
    // Send message with embed
    const messagePreamble = `${quote.seq}: **${quoter.displayName}** saved a quote by **${author.displayName}**:`;
    message.channel.send(messagePreamble, embed);
  }
}