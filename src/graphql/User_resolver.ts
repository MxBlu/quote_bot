/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arg, Authorized, FieldResolver, Query, Resolver, Root } from "type-graphql";

import { IUser, User, UserModel, UserMultiQuery, UserSingleQuery } from "../models/User.js";
import { getBestGuildMemberById } from "../models/UserLite.js";
import { QuoteBot } from "../modules/quotebot.js";

@Resolver(of => User)
export class UserResolver {

  @Authorized()
  @Query(returns => [User], { nullable: true })
  public users(@Arg("guildId") guildId: string): UserMultiQuery {
    return UserModel.getByGuild(guildId);
  }

  @Authorized()
  @Query(returns => User, { nullable: true })
  public user(@Arg("userId") userId: string, @Arg("guildId") guildId: string): UserSingleQuery {
    return UserModel.getById(userId, guildId);
  }

  @FieldResolver()
  public async avatarUrl(@Root() user: IUser): Promise<string> {
    // Using the Discord Guild object, fetch the best user profile we can
    const guild = await QuoteBot.discord.guilds.fetch(user.guild);
    const userLite = await getBestGuildMemberById(guild, user._id.user);
    // Extract and return the avatar URL
    return userLite.displayAvatarURL;
  }

}