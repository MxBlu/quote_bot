import { getModelForClass, plugin, prop, ReturnModelType } from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';

// We can't define the types for the DocumentQuery's correctly yet
// TODO: Revisit
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

// TODO: Convert mongoose-auto-increment counter to new one 
@plugin(AutoIncrementID, {trackerCollection: 'seq_counters', field: 'seq', startAt: 1, reference_fields: ['guild']})
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
  @prop({index: true})
  public link: string;

  // Date of quoted message
  @prop()
  public timestamp: Date;

  public static getBySeq(this: ReturnModelType<typeof Quote>, guild: string, seq: number) {
    return this.findOne({ guild, seq });
  }

  public static async getRandom(this: ReturnModelType<typeof Quote>, guild: string): Promise<Quote> {
    const res = await this.aggregate([{ $match: { guild } }, { $sample: { size: 1 } }]).exec();
    return res.length > 0 ? res[0] : null;
  }
  
  public static async getRandomFromAuthor(this: ReturnModelType<typeof Quote>, 
      guild: string, author: string): Promise<Quote> {
    const res = await this.aggregate([{ $match: { author, guild } }, { $sample: { size: 1 } }]).exec();
    return res.length > 0 ? res[0] : null;
  }

  public static deleteBySeq(this: ReturnModelType<typeof Quote>, guild: string, seq: number) {
    return this.deleteOne({ guild, seq });
  }

  public static findByGuild(this: ReturnModelType<typeof Quote>, guild: string) {
    return this.find({ guild });
  }

  public static findByChannel(this: ReturnModelType<typeof Quote>, channel: string) {
    return this.find({ channel });
  }

  public static findByAuthor(this: ReturnModelType<typeof Quote>, author: string, guild: string) {
    return this.find({ author, guild });
  }

  public static checkExists(this: ReturnModelType<typeof Quote>, link: string) {
    return this.exists({ link });
  }
}

export const QuoteModel = getModelForClass(Quote);