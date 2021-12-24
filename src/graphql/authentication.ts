import { AuthenticationError, ExpressContext } from "apollo-server-express";
import { Logger } from "bot-framework";
import { QuoteBot } from "../modules/quotebot";
import { DiscordRESTHelper } from "../support/discord_rest";
import { DiscordTokenStore } from "../support/discord_token_store";
import { GraphQLContext } from "./context";

export class GraphQLAuthentication {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GraphQLAuthentication");
  }

  public async generateContext(expressContext: ExpressContext): Promise<GraphQLContext> {
    const sessionId = expressContext.req.cookies.sessionId as string;
    // No session means not logged in
    if (sessionId == null || Object.keys(sessionId).length === 0) {
      throw new AuthenticationError("Not logged in");
    }

    const token = await DiscordTokenStore.validateSession(sessionId);
    // No token also means not logged in
    if (token == null) {
      throw new AuthenticationError("Not logged in");
    }

    // Get user data from Discord REST API
    const userData = await DiscordRESTHelper.user(token);
    // Then fetch the rich User and return it as part of the context
    return {
      user: await QuoteBot.discord.users.fetch(userData.id)
    };
  }
}