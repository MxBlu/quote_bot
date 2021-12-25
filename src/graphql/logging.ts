import { Logger } from "bot-framework";
import { MiddlewareInterface, NextFn, ResolverData } from "type-graphql";

import { GraphQLContext } from "./context.js";

export class GraphQLLogging implements MiddlewareInterface<GraphQLContext> {
  
  logger: Logger;

  constructor() {
    this.logger = new Logger("GraphQLLogging");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async use({ context, info }: ResolverData<GraphQLContext>, next: NextFn): Promise<any> {
    // Get username from user in context
    const caller = context.user?.username ?? '<unauthenticated>';
    // Only log "Query" requests, other requests are too verbose
    if (info.parentType.name == 'Query') {
      this.logger.debug(`${caller} calling ${info.fieldName} - Parameters: ${JSON.stringify(info.variableValues)}`);
    }
    return next();
  }

}