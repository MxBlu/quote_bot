import { ApolloServer } from "apollo-server";
import { Logger } from "bot-framework";
import { buildSchema } from "type-graphql";

import { GRAPHQL_DEBUG } from "../constants/constants.js";
import { GraphQLAuthentication } from "../graphql/authentication.js";
import { GraphQLLogging } from "../graphql/logging_middleware.js";
import { QuoteResolver } from "../graphql/Quote_resolver.js";
import { UserResolver } from "../graphql/User_resolver.js";

class GraphQLServerImpl {
  server: ApolloServer;

  logger: Logger;

  constructor() {
    this.logger = new Logger("GraphQLServer");
  }

  public async init(port: number): Promise<void> {
    const schema = await buildSchema({
      resolvers: [ QuoteResolver, UserResolver ],
      globalMiddlewares: [ GraphQLLogging ]
    });

    const authentication = new GraphQLAuthentication();

    this.server = new ApolloServer({ 
      schema: schema, 
      context: authentication.generateContext.bind(authentication),
      cors: {
        origin: "https://studio.apollographql.com",
        credentials: true
      },
      debug: GRAPHQL_DEBUG
    });

    await this.server.listen(port);
    this.logger.debug(`Server running on port ${port}`);
  }
}

export const GraphQLServer = new GraphQLServerImpl();