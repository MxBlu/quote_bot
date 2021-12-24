import { Logger } from "bot-framework";
import { GuildChannel } from "discord.js";
import { ResolverData } from "type-graphql";

import { QuoteBot } from "../modules/quotebot.js";
import { GraphQLContext } from "./context.js";

export class GraphQLAuthorization {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GraphQLAuthentication");
  }

  public async check(resolverData: ResolverData<GraphQLContext>): Promise<boolean> {
    const startTime = performance.now()

    const args = resolverData.args;
    const context = resolverData.context;

    // Get the referenced guild in the request
    let guildId: string = null;
    if ('guildId' in args) {
      // Get guild directly from args
      guildId = args.guildId;

    } else if ('channelId' in args) {
      // Try to get the Channel object for the given channel
      const channel = await QuoteBot.discord.channels.fetch(args.channelId);
      // If we can't get it, it means that the bot can't see it,
      //  and therefore is unauthorized
      if (channel == null || !(channel instanceof GuildChannel)) {
        return false;
      }
      // Get guild that the channel belongs to
      guildId = channel.guild.id;

    } else {
      // We don't know how to authorize this request...
      this.logger.warn(
        `Authorization cannot be determined: no known args for ${resolverData.info.fieldName}`);
      return false;
    }

    // Check if the user is part of the requested guild
    // Also check if the bot is in the requested server
    // If true, request is authorized
    const authorized = context.guilds.some(g => g.id == guildId) &&
        QuoteBot.discord.guilds.cache.some(g => g.id == guildId);
        
    const endTime = performance.now();
    this.logger.trace(`Authorization: ${endTime - startTime}ms`);

    return authorized;
  }
}
