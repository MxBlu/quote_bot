
module.exports = (discord, db, imm, logger) => {
  async function quoteHandler(message, quoter) {

  }

	return {
    // If the message has a '#' emoji, treat it as a reaction
    messageReactionHandler: async (reaction, user) => {
      // Dumb ass shit cause Discord.js doesn't resolve them
      reaction = await reaction.fetch();
      user = await user.fetch();

      logger.info(`Reaction with emoji ${reaction.emoji.name} detected`, 3);
      if (reaction.emoji.name === "#️⃣") {
        quoteHandler(reaction.message, user);
      }
    }
  }
}
