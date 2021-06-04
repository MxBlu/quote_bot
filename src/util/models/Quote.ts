import { getModelForClass, plugin, prop, ReturnModelType } from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';

// TODO: Convert mongoose-auto-increment counter to new one 
@plugin(AutoIncrementID, {trackerModelName: 'guild_seq', field: 'seq', reference_fields: ['guild']})
export class Quote {
  // Sequencing value, unique to the guild. For referencing quotes in a list
  @prop({index: true})
  public seq: Number;

  // Channel ID of quoted message
  @prop({index: true})
  public channel: String;

  // Guild ID of quoted message
  @prop({index: true})
  public guild: String;

  // Message contents, in form of embed description
  @prop()
  public message: String;

  // User ID of quoted message author
  @prop({index: true})
  public author: String;

  // User ID of quote saver
  @prop()
  public quoter: String;

  // Image link if present in message
  @prop()
  public img: String;

  // URL of quoted message
  @prop()
  public link: String;

  // Date of quoted message
  @prop()
  public timestamp: Date;

  public static async getBySeq(this: ReturnModelType<typeof Quote>, guild: String, seq: Number): Promise<Quote> {
    return this.findOne({ guild, seq }).exec();
  }

  public static async getRandom(this: ReturnModelType<typeof Quote>, guild: String): Promise<Quote> {
    var res = await this.aggregate([{ $match: { guild } }, { $sample: { size: 1 } }]).exec();
    return res.length > 0 ? res[0] : null;
  }

  public static async deleteBySeq(this: ReturnModelType<typeof Quote>, guild: String, seq: Number): Promise<void> {
    return this.findOne({ guild, seq }).exec();
  }

  public static async findByGuild(this: ReturnModelType<typeof Quote>, guild: String): Promise<Quote[]> {
    return this.find({ guild }).exec();
  }

  public static async findByChannel(this: ReturnModelType<typeof Quote>, channel: String): Promise<Quote[]> {
    return this.find({ channel }).exec();
  }

  public static async findByAuthor(this: ReturnModelType<typeof Quote>, author: String, guild: String): Promise<Quote[]> {
    return this.find({ author, guild }).exec();
  }
}

export const QuoteModel = getModelForClass(Quote);