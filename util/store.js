const mongoose  = require('mongoose');

const Quote = require('./models/Quote');

module.exports = (mongoUrl, logger) => {
  
  // Guilds and channels can be ephemeral
  var guilds = new Set();
  var channels = {};

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err}`);
  });

  mongoose.connection.once('open', () => {
    logger.info('MongoDB connected', 1);
  });

  return {

    // Return guilds set
    getGuilds: () => {
      return guilds;
    },

    // Add all args as guilds to guild set
    // Also create channel maps
    addGuilds: (...guildIds) => {
      guildIds.forEach((g) => {
        guilds.add(g);
        channels[g] = {};
      });
      
    },

    // Remove guild from guild set
    // Also remove channel set
    removeGuild: (guildId) => {
      guilds.delete(guildId);
      delete channels[guildId];
    },

    // Return channels map ( channelId => channelName )
    getChannelMap: (guildId) => {
      return channels[guildId];
    },

    // Add channel to channel map
    addChannel: (guildId, channelId, channelName) => {
      channels[guildId][channelId] = channelName;
    },

    // Remove channel from channel map
    delChannel: (guildId, channelId) => {
      delete channels[guildId][channelId];
    },

    // Get a quote with given seq number in a certain guild
    getQuoteBySeq: async (guildId, seq) => {
      return Quote.getBySeq(guildId, seq);
    },

    // Get all quotes in a certain guild
    getQuotesByGuild: async (guildId) => {
      return Quote.findByGuild(guildId);
    },

    // Get all quotes in a certain channel
    getQuotesByChannel: async (channelId) => {
      return Quote.findByChannel(channelId);
    },

    // Get all quotes in by a given author in a certain guild
    getQuotesByAuthor: async (userId, guildId) => {
      return Quote.findByAuthor(userId, guildId);
    },

    // Add a quote to the db
    addQuote: async (guildId, channelId, authorId, quoterId,
          message, link, timestamp) => {
      let quote = new Quote({
        channel: channelId,
        guild: guildId,
        message,
        author: authorId,
        quoter: quoterId,
        link,
        timestamp,
      })
      return quote.save();
    },

    // Delete a quote from the db
    delQuote: async (guildId, seq) => {
      return Quote.deleteBySeq(guildId, seq);
    },

  }
}