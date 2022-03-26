import { AuthenticationError, ExpressContext } from "apollo-server-express";
import { Logger } from "bot-framework";
import { parse } from "cookie";
import { GRAPHQL_AUTH_BYPASS_TOKEN } from "../constants/constants.js";

import { SessionStore } from "../support/session_store.js";
import { GraphQLContext } from "./context.js";

// Session cookie should be mapped to a stored session which
//  should contain Discord data to authenticate the user
export class GraphQLAuthentication {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GraphQLAuthentication");
  }

  public async generateContext(expressContext: ExpressContext): Promise<GraphQLContext> {
    // Authorization header can be set to a fixed token to bypass all auth checks
    const authorizationHeader = expressContext.req.headers.authorization;
    if (authorizationHeader != null && GRAPHQL_AUTH_BYPASS_TOKEN != null) {
      if (authorizationHeader == `Bearer ${GRAPHQL_AUTH_BYPASS_TOKEN}`) {
        // If matching, set bypassAuthorization in context
        return { bypassAuthorization: true };
      } else {
        // Otherwise, fail authentication early
        throw new AuthenticationError("Not logged in");
      }
    }
    // Parse cookies on HTTP request
    if (!expressContext.req.headers.cookie) {
      expressContext.req.headers.cookie = "";
    }
    const cookies = parse(expressContext.req.headers.cookie);
    // Pull out session cookie
    const sessionId = cookies.sessionId as string;
    // No session means not logged in
    if (sessionId == null || Object.keys(sessionId).length === 0) {
      throw new AuthenticationError("Not logged in");
    }

    // Make sure the session is still valid
    const session = await SessionStore.validateSession(sessionId, false);
    // No session also means not logged in
    if (session == null) {
      throw new AuthenticationError("Not logged in");
    }

    // Get user data and guild list from Discord REST API
    // Return them as part of the context
    return {
      user: session.user,
      guilds: session.guilds
    };
  }
}