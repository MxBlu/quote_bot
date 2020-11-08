const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const QuoteSchema = new mongoose.Schema({
  seq: { // Sequencing value, unique to the guild. For referencing quotes in a list
    type: Number,
    index: true
  },
  channel: { // Channel ID of quoted message
    type: String,
    index: true
  },
  guild:  { // Guild ID of quoted message
    type: String,
    index: true
  },
  message: String, // Message contents, in form of embed description
  author: { // User ID of quoted message author
    type: String,
    index: true,
  },
  quoter: String, // User ID of quote saver
  img: String, // Image link if present in message
  link: String, // URL of quoted message
  timestamp: Date // Date of quoted message
});
// AutoIncrement handles maintaining the sequencing value 
QuoteSchema.plugin(AutoIncrement, {id: 'guild_seq', inc_field: 'seq', reference_fields: ['guild']});
QuoteSchema.statics.getBySeq = function (guild, seq) { 
  return this.findOne({ guild, seq });
}
QuoteSchema.statics.getRandom = async function (guild) {
  var res = await this.aggregate([{ $match: { guild } }, { $sample: { size: 1 } }]).exec();
  return res.length > 0 ? res[0] : null;
}
QuoteSchema.statics.deleteBySeq = function (guild, seq) { 
  return this.deleteOne({ guild, seq });
}
QuoteSchema.statics.findByGuild = function (guild) { 
  return this.find({ guild });
}
QuoteSchema.statics.findByChannel = function (channel) { 
  return this.find({ channel });
}
QuoteSchema.statics.findByAuthor = function (author, guild) { 
  return this.find({ author, guild });
}

module.exports = mongoose.model('Quote', QuoteSchema);