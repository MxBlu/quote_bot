import { APIGuild, APIUser } from "discord-api-types/v10";

export class GraphQLContext {
  // Authenticated user
  user?: APIUser;
  // Guilds authenticated user is in
  guilds?: APIGuild[];
  // Authorization bypass
  bypassAuthorization? = false;
}