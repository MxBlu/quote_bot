import { ApolloServer } from "apollo-server";
import { ApolloServerPluginLandingPageDisabled, ApolloServerPluginLandingPageLocalDefault } from "apollo-server-core";
import { Dependency, Logger } from "bot-framework";
import { buildSchema } from "type-graphql";

import { GRAPHQL_DEBUG } from "../constants/constants.js";
import { GraphQLAuthentication } from "../graphql/authentication.js";
import { GraphQLAuthorization } from "../graphql/authorization.js";
import { GraphQLLogging } from "../graphql/logging.js";
import { QuoteResolver } from "../graphql/Quote_resolver.js";
import { UserResolver } from "../graphql/User_resolver.js";
import { StoreDependency } from "../support/store.js";
import { QuoteBotDependency } from "./quotebot.js";

class GraphQLServerImpl {
  server: ApolloServer;

  logger: Logger;

  constructor() {
    this.logger = new Logger("GraphQLServer");
  }

  public async init(port: number): Promise<void> {
    // We need QuoteBot for the Discord session, and Store for data
    await Dependency.awaitMultiple(QuoteBotDependency, StoreDependency);

    const authentication = new GraphQLAuthentication();
    const authorization = new GraphQLAuthorization();
    
    const schema = await buildSchema({
      resolvers: [ QuoteResolver, UserResolver ],
      globalMiddlewares: [ GraphQLLogging ],
      authChecker: authorization.check.bind(authorization),
    });

    this.server = new ApolloServer({ 
      schema: schema, 
      context: authentication.generateContext.bind(authentication),
      cors: {
        origin: true, // TODO: Make origin strict in production
        credentials: true
      },
      debug: GRAPHQL_DEBUG,
      plugins: [
        GRAPHQL_DEBUG 
          ? ApolloServerPluginLandingPageLocalDefault()
          : ApolloServerPluginLandingPageDisabled()
      ]
    });

    // Start server, handling only IPv4
    await this.server.listen({ port, host: "0.0.0.0" });
    this.logger.info(`Server running on port ${port}`);
  }
}

export const GraphQLServer = new GraphQLServerImpl();