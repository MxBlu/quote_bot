const mongoose  = require('mongoose');

const Quote = require('./models/Quote');

module.exports = (logger) => {

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB error: ${err}`);
  });

  mongoose.connection.once('open', () => {
    logger.info('MongoDB connected', 1);
  });

  return {

    // Get a quote with given seq number in a certain guild
    getQuoteBySeq: (guildId, seq) => {
      return Quote.getBySeq(guildId, seq);
    },

    // Get a random quote in a certain guild
    getRandomQuote: async (guildId) => {
      return Quote.getRandom(guildId);
    },

    // Get all quotes in a certain guild
    getQuotesByGuild: (guildId) => {
      return Quote.findByGuild(guildId);
    },

    // Get all quotes in a certain channel
    getQuotesByChannel: (channelId) => {
      return Quote.findByChannel(channelId);
    },

    // Get all quotes in by a given author in a certain guild
    getQuotesByAuthor: (userId, guildId) => {
      return Quote.findByAuthor(userId, guildId);
    },

    // Add a quote to the db
    addQuote: async (guildId, channelId, authorId, quoterId,
          message, img, link, timestamp) => {
      let quote = new Quote({
        channel: channelId,
        guild: guildId,
        message,
        author: authorId,
        quoter: quoterId,
        img,
        link,
        timestamp,
      })
      return quote.save();
    },

    // Delete a quote from the db
    delQuote: (guildId, seq) => {
      return Quote.deleteBySeq(guildId, seq);
    },

  }
}