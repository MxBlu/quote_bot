/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arg, Authorized, Query, Resolver } from "type-graphql";

import { User, UserModel, UserMultiQuery, UserSingleQuery } from "../models/User.js";
import { PaginationArgs } from "./pagination.js";

@Resolver(of => User)
export class UserResolver {

  @Authorized()
  @Query(returns => [User], { nullable: true })
  public users(@Arg("guildId") guildId: string, 
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): UserMultiQuery {
    return UserModel.getByGuild(guildId)
        .skip(options.offset).limit(options.limit);
  }

  @Authorized()
  @Query(returns => User, { nullable: true })
  public user(@Arg("userId") userId: string, @Arg("guildId") guildId: string): UserSingleQuery {
    return UserModel.getById(userId, guildId);
  }

}