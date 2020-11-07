
module.exports = (discord, db, imm, logger) => {

  return {

    listquotesHandler: async (command) => {
      // 0 args - all from guild
      // 1 arg - either channel or user - all from channel/user filter by guild
      // 2 args - start from seq value given
    },

    getquoteHandler: async (command) => {
      // 0 args - get random quote from guild
      // 1 arg - get specific quote
    },

    delquoteHandler: async (command) => {
      // 1 arg - seq number to delete
    }
    
  }
}
