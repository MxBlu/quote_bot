const DISCORD_MAX_LEN = 1900;

// Split up a string into ideally endline terminated strings
// at most length DISCORD_MAX_LEN
function chunkString(str) {
  let chunks = [];
  let strBuffer = '';

  // Split by newline and concat strings until ideal length
  // Then add so chunks list
  str.split("\n").forEach(s => {
    // A single oversized string, chunk by length
    if (s.length > DISCORD_MAX_LEN) {
      // Flush buffer as a chunk if there's any
      if (strBuffer.length > 0) {
        chunks.push(strBuffer);
        strBuffer = '';
      }
      for (let i = 0; i < s.length; i += DISCORD_MAX_LEN) {
        chunks.push(s.substr(i, DISCORD_MAX_LEN));
      }
    // Adding the current string would cause it to go oversized
    // Add the current buffer as a chunk, then set the buffer 
    //   to the current str
    } else if (strBuffer.length + s.length + 1 > DISCORD_MAX_LEN) {
      chunks.push(strBuffer);
      strBuffer = s + "\n";
    // Otherwise, add the string the the buffer
    } else {
      strBuffer += s + "\n";
    }
  });

  // Flush the buffer again
  if (strBuffer.length > 0) {
    chunks.push(strBuffer);
    strBuffer = '';
  }

  return chunks;
}

// Send reply to a user command, logging if appropriate
function sendCmdMessage(message, msg, level, logger) {
  logger.info(`${message.author.username} - ${message.guild.name} - ${msg}`, level);
  sendMessage(message.channel, msg);
}

// Send message to a given channel, chunking if necessary
function sendMessage(targetChannel, msg) {
  var msgChunks = chunkString(msg);
  msgChunks.forEach(
    (chunk) => targetChannel.send(chunk));
}

// Compare 2 strings ignoring case 
// Return true if they're equivalent
// Returns true if both strings are null, otherwise 
// return false if either are null
function stringEquivalence(str1, str2) {
  if (str1 === null || str2 == null) {
    return str1 == str2;
  }

  return str1.toLowerCase() === str2.toLowerCase();
}

// Search for str2 in str1 ignoring case
// Returns true if both strings are null, otherwise 
// return false if either are null
function stringSearch(str1, str2) {
  if (str1 === null || str2 == null) {
    return str1 == str2;
  }

  return str1.toLowerCase().includes(str2.toLowerCase());
}

// Test if the author of a given message is admin
async function isAdmin(message) {
  const author = await message.guild.members.fetch(message.author.id);
  return author.permissions.has("ADMINISTRATOR");
}

// Get the best GuildMember object for a given User
async function getBestGuildMember(db, guild, user) {
  // First, try and get the user from the guild
  try {
    return await guild.members.fetch(user.id);
  } catch(e) {
    // Only DiscordAPIError is passable - means the user is not in the guild anymore
    if (e.name !== 'DiscordAPIError') {
      throw e;
    }
  }

  // Ok user isn't in the guild, that's ok...
  // Get data from the db instead
  const dbUser = await db.getUser(user.id, guild.id);
  if (dbUser != null) {
    // Make a mock "GuildMember" object
    return {
      id: user.id,
      displayName: dbUser.displayName,
      user: {
        displayAvatarURL: () => user.displayAvatarURL()
      }
    }
  }

  // If nothing else, create a mock GUildMember with whatever we have
  return {
    id: user.id,
    displayName: user.username,
    user: {
      displayAvatarURL: () => user.displayAvatarURL()
    }
  }
}

// Get the best GuildMember object for a given User id
async function getBestGuildMemberById(db, guild, userId) {
  // First, try and get the user from the guild
  try {
    return await guild.members.fetch(userId);
  } catch(e) {
    // Only DiscordAPIError is passable - means the user is not in the guild anymore
    if (e.name !== 'DiscordAPIError') {
      throw e;
    }
  }

  // Ok user isn't in the guild, that's ok...
  // Get data from the db instead
  const dbUser = await db.getUser(userId, guild.id);
  if (dbUser != null) {
    // Make a mock "GuildMember" object
    // Default avatar URL 
    return {
      id: userId,
      displayName: dbUser.displayName,
      user: {
        displayAvatarURL: () => guild.client.rest.cdn.DefaultAvatar(dbUser.discriminator % 5)
      }
    }
  }

  // If nothing else, create a mock GUildMember with whatever we have
  return {
    id: userId,
    displayName: '(Unknown)',
    user: {
      displayAvatarURL: () => guild.client.rest.cdn.DefaultAvatar(parseInt(userId) % 5)
    }
  }
}

exports.sendCmdMessage = sendCmdMessage;
exports.sendMessage = sendMessage;
exports.stringEquivalence = stringEquivalence;
exports.stringSearch = stringSearch;
exports.isAdmin = isAdmin;
exports.getBestGuildMember = getBestGuildMember;
exports.getBestGuildMemberById = getBestGuildMemberById;