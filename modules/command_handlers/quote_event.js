
module.exports = (discord, db, imm, logger) => {
  async function quoteHandler(message, quoter) {

  }

	return {
    // If the message has a '#' emoji, treat it as a reaction
    messageReactionHandler: (reaction, user) => {
      logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 3);
      if (reaction.emoji.name === '#') {
        quoteHandler(reaction.message, user);
      }
    }
  }
}
