import { Guild } from "discord.js";

import { QuoteDoc } from "../models/Quote.js";
import { getBestGuildMemberById } from "../models/UserLite.js";

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