import { getModelForClass, plugin, prop, ReturnModelType } from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';

// TODO: Convert mongoose-auto-increment counter to new one 
@plugin(AutoIncrementID, {trackerModelName: 'guild_seq', field: 'seq', reference_fields: ['guild']})
export class Quote {
  // Sequencing value, unique to the guild. For referencing quotes in a list
  @prop({index: true})
  public seq?: number;

  // Channel ID of quoted message
  @prop({index: true})
  public channel: string;

  // Guild ID of quoted message
  @prop({index: true})
  public guild: string;

  // Message contents, in form of embed description
  @prop()
  public message: string;

  // User ID of quoted message author
  @prop({index: true})
  public author: string;

  // User ID of quote saver
  @prop()
  public quoter: string;

  // Image link if present in message
  @prop()
  public img: string;

  // URL of quoted message
  @prop()
  public link: string;

  // Date of quoted message
  @prop()
  public timestamp: Date;

  public static async getBySeq(this: ReturnModelType<typeof Quote>, guild: string, seq: number): Promise<Quote> {
    return this.findOne({ guild, seq }).exec();
  }

  public static async getRandom(this: ReturnModelType<typeof Quote>, guild: string): Promise<Quote> {
    const res = await this.aggregate([{ $match: { guild } }, { $sample: { size: 1 } }]).exec();
    return res.length > 0 ? res[0] : null;
  }

  // TODO: FIXME
  public static async deleteBySeq(this: ReturnModelType<typeof Quote>, guild: string, seq: number): Promise<Quote> {
    return this.findOne({ guild, seq }).exec();
  }

  public static async findByGuild(this: ReturnModelType<typeof Quote>, guild: string): Promise<Quote[]> {
    return this.find({ guild }).exec();
  }

  public static async findByChannel(this: ReturnModelType<typeof Quote>, channel: string): Promise<Quote[]> {
    return this.find({ channel }).exec();
  }

  public static async findByAuthor(this: ReturnModelType<typeof Quote>, author: string, guild: string): Promise<Quote[]> {
    return this.find({ author, guild }).exec();
  }
}

export const QuoteModel = getModelForClass(Quote);