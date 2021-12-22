/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arg, Query, Resolver } from "type-graphql";

import { User, UserModel, UserSingleQuery } from "../models/User.js";

@Resolver(of => User)
export class UserResolver {

    @Query(returns => User, { nullable: true })
    public user(@Arg("userId") userId: string, @Arg("guildId") guildId: string): UserSingleQuery {
        return UserModel.getById(userId, guildId);
    }

}