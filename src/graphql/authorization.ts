import { Logger } from "bot-framework";
import { GuildChannel } from "discord.js";
import { ResolverData } from "type-graphql";

import { QuoteBot } from "../modules/quotebot.js";
import { GraphQLContext } from "./context.js";

// Authorization built around a few concepts:
// 1.   Users can only request content for guilds that they are in
// 2.   The bot must also be in the requested guild
export class GraphQLAuthorization {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GraphQLAuthentication");
  }

  public async check(resolverData: ResolverData<GraphQLContext>): Promise<boolean> {
    const args = resolverData.args;
    const context = resolverData.context;

    // Get the referenced guild in the request
    let guildId: string = null;
    if ('guildId' in args) {
      // Get guild directly from args
      guildId = args.guildId;

    } else if ('channelId' in args) {
      try {
        // Try to get the Channel object for the given channel
        const channel = await QuoteBot.discord.channels.fetch(args.channelId);
        // Get guild that the channel belongs to
        guildId = (channel as GuildChannel).guild.id;
      } catch (e) {
        // If we can't get the channel, it means that the bot can't see it,
        //  and therefore is in a guild the bot is not
        return false;
      }

    } else {
      // We don't know how to authorize this request...
      this.logger.warn(
        `Authorization cannot be determined: no known args for ${resolverData.info.fieldName}`);
      return false;
    }

    // Check if the user is part of the requested guild
    // We do this by fetching the guild, and attempting to fetch the user
    try {
      const guild = await QuoteBot.discord.guilds.fetch(guildId);
      const guildMember = await guild.members.fetch(context.user.id);

      return guildMember != null;
    } catch (e) {
      // If an exception is thrown (DiscordAPIError in particular)
      //  the bot isn't in the guild or the user isn't in the guild
      return false;
    }
  }
}
