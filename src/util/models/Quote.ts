import { Schema, Model, model, Document, Mongoose } from 'mongoose';
import * as AutoIncrementFactory from 'mongoose-sequence';
const AutoIncrement = new AutoIncrementFactory(new Mongoose().connection);

const QuoteSchema = new Schema<Quote>({
  seq: {
    type: Number,
    index: true
  },
  channel: {
    type: String,
    index: true
  },
  guild: {
    type: String,
    index: true
  },
  message: String,
  author: {
    type: String,
    index: true,
  },
  quoter: String,
  img: String,
  link: String,
  timestamp: Date
});
// AutoIncrement handles maintaining the sequencing value 
QuoteSchema.plugin(AutoIncrement, {id: 'guild_seq', inc_field: 'seq', reference_fields: ['guild']});

export interface Quote extends Document {
  // Sequencing value, unique to the guild. For referencing quotes in a list
  seq: Number;
  // Channel ID of quoted message
  channel: String;
  // Guild ID of quoted message
  guild: String;
  // Message contents, in form of embed description
  message: String;
  // User ID of quoted message author
  author: String;
  // User ID of quote saver
  quoter: String;
  // Image link if present in message
  img: String;
  // URL of quoted message
  link: String;
  // Date of quoted message
  timestamp: Date;
}

export interface QuoteModel extends Model<Quote> {
  getBySeq(guild: String, seq: Number): Promise<Quote>;
  getRandom(guild: String): Promise<Quote>;
  deleteBySeq(guild: String, seq: Number): Promise<Quote>; // TODO: Validate
  findByGuild(guild: String): Promise<Array<Quote>>;
  findByChannel(guild: String): Promise<Array<Quote>>;
  findByAuthor(author: String, guild: String): Promise<Array<Quote>>;
}

// Various helper functions, function as named
QuoteSchema.statics.getBySeq = function (this: Model<Quote>, guild: String, seq: Number) { 
  return this.findOne({ guild, seq }).exec();
}
QuoteSchema.statics.getRandom = async function (this: Model<Quote>, guild: String) {
  var res = await this.aggregate([{ $match: { guild } }, { $sample: { size: 1 } }]).exec();
  return res.length > 0 ? res[0] : null;
}
QuoteSchema.statics.deleteBySeq = function (this: Model<Quote>, guild: String, seq: Number) { 
  return this.deleteOne({ guild, seq }).exec();
}
QuoteSchema.statics.findByGuild = function (this: Model<Quote>, guild: String) { 
  return this.find({ guild }).exec();
}
QuoteSchema.statics.findByChannel = function (this: Model<Quote>, channel: String) { 
  return this.find({ channel }).exec();
}
QuoteSchema.statics.findByAuthor = function (this: Model<Quote>, author: String, guild: String) { 
  return this.find({ author, guild }).exec();
}

export default model<Quote, QuoteModel>("Quote", QuoteSchema);