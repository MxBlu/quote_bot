import { Guild, Constants as DiscordConstants, User as DiscordUser } from "discord.js";
import { Store } from "../store.js";
import { User } from "./User.js";

const DISCORD_CDN = DiscordConstants.Endpoints.CDN(DiscordConstants.DefaultOptions.http.cdn);  

// As much of a GuildMember that we can get
export class UserLite {
  // User ID
  id: string;
  // Either nickname or username
  displayName: string;
  // URL to avatar
  displayAvatarURL: string;
}

// Get the best GuildMember object for a given User id
export const getBestGuildMemberById = async function(guild: Guild, userId: string): Promise<UserLite> {
  const bestUser = new UserLite();
  bestUser.id = userId;
  // First, try and get the user from the guild
  try {
    const guildMember = await guild.members.fetch(userId);
    bestUser.displayName = guildMember.displayName;
    bestUser.displayAvatarURL = guildMember.user.displayAvatarURL();
    return bestUser;
  } catch(e) {
    // Only DiscordAPIError is passable - means the user is not in the guild anymore
    if (e.name !== 'DiscordAPIError') {
      throw e;
    }
  }

  // Ok user isn't in the guild, that's ok...
  // Get data from the db instead
  const dbUser: User = await Store.get().getUser(userId, guild.id).exec();
  if (dbUser != null) {
    // Make a mock "GuildMember" object
    // Default avatar URL
    bestUser.displayName = dbUser.displayName;
    bestUser.displayAvatarURL = DISCORD_CDN.DefaultAvatar(Number(dbUser.discriminator) % 5)
    return bestUser;
  }
  
  // If nothing else, create a mock GuildMember with whatever we have
  bestUser.displayName = '(Unknown)';
  bestUser.displayAvatarURL = DISCORD_CDN.DefaultAvatar(parseInt(userId) % 5);
  return bestUser;
}

// Get the best GuildMember object for a User
export const getBestGuildMember = async function(guild: Guild, user: DiscordUser): Promise<UserLite> {
  return getBestGuildMemberById(guild, user.id);
}