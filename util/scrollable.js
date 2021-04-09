// Default time for a modal to stay active
const DEFAULT_MODAL_DURATION = 300000; // 5 minutes

module.exports = (discord, logger) => {

  // Active scroll modals
  var activeModals = {};

  async function removeModal(message) {
    // Shouldn't happen... but sanity check
    if (!(message.id in activeModals)) {
      logger.error(`Message ID ${message.id} doesn't has an active modal`);
      return;
    }

    let modalProps = activeModals[message.id];
    // If we have a function to call on removal, call it
    if (modalProps.removalHandler != null) {
      modalProps.removalHandler(message, modalProps);
    }
    // Remove from active modal list
    delete activeModals[message.id];
    // Remove all reactions
    message.reactions.removeAll();
  }

  return {

    addModal: async (message, modalProps, duration = DEFAULT_MODAL_DURATION) => {
      // Shouldn't happen... but sanity check
      if (message.id in activeModals) {
        logger.error(`Message ID ${message.id} already has an active modal`);
        return;
      }

      // Add to active modal list
      activeModals[message.id] = modalProps;
      // Add navigation reactions
      message.react("⬅️");
      message.react("➡️");

      // Set lifetime timer
      setTimeout((m) => removeModal(m), duration, message);
    },

    messageReactionHandler: async (reaction, user) => {
      // Only handle reactions for active modals
      if (!(reaction.message.id in activeModals)) {
        return;
      }

      // Ignore reacts by the bot itself
      if (user.id == discord.user.id) {
        return;
      }

      let modalProps = activeModals[reaction.message.id];
      
      // Handle emojis we care about
      // Remove reaction if we're handling em
      switch (reaction.emoji.name) {
      case "⬅️":
        // Call left quote handler function if defined
        if (modalProps.leftHandler != null) {
          modalProps.leftHandler(modalProps, reaction, user);
        }
        reaction.users.remove(user);
        break;
      case "➡️":
        // Call right quote handler function if defined
        if (modalProps.rightHandler != null) {
          modalProps.rightHandler(modalProps, reaction, user);
        }
        reaction.users.remove(user);
        break;
      }
    }

  }
}