const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const QuoteSchema = new mongoose.Schema({
    seq: {
        type: Number,
        index: true
    },
    channel: {
        type: String,
        index: true
    },
    guild:  {
        type: String,
        index: true
    },
    message: String,
    author: {
        type: String,
        index: true,
    },
    quoter: String,
    link: String,
    timestamp: Date
});
QuoteSchema.plugin(AutoIncrement, {id: 'guild_seq', inc_field: 'seq', reference_fields: ['guild']});
QuoteSchema.statics.getBySeq = function (guild, seq) { 
    return this.findOne({ guild, seq });
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