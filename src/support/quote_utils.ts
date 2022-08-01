import { EmbedBuilder, Guild, Message } from "discord.js";

import { QuoteDoc } from "../models/Quote.js";
import { getBestGuildMemberById, UserLite } from "../models/UserLite.js";

const IMG_RX = /https?:\/\/[^\s]+\.(?:jpe?g|png|gif)/i;

 // Generate quote display lines
export const generateQuoteMsgs = async (guild: Guild, quotes: QuoteDoc[]): Promise<string[]> => {
  // Generate array of quote display lines
  const quoteMsgs: string[] = [];
  for (const quote of quotes) {
    // Get author and quoter GuildMember objects best we can
    const author = await getBestGuildMemberById(guild, quote.author);
    const quoter = await getBestGuildMemberById(guild, quote.quoter);

    // Generate a list of quote links for 'listquotes'
    quoteMsgs.push(`${quote.seq}: [**${quoter.displayName}** quoted **${author.displayName}** ` +
        `(${quote.timestamp.toLocaleString()})](${quote.link})`);
  }

  return quoteMsgs;
}

// Create a quote embed
export const generateEmbed = (message: Message, author: UserLite): EmbedBuilder => {
  // Create embed content
  let content = `${message.content}\n`
              + `[Link](${message.url})`;

  // Create base embed
  const embed = new EmbedBuilder()
      .setColor("Random")
      .setTimestamp(message.createdAt)
      .setAuthor({ name: author.displayName, iconURL: author.displayAvatarURL });

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
    if (embed.data.image?.url === null) {
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