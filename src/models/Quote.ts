/* eslint-disable @typescript-eslint/no-unused-vars */
import { DocumentType, getModelForClass, isDocument, plugin, prop, Ref, ReturnModelType } from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { Field, ObjectType } from 'type-graphql';
import { DocumentQuery, Query } from 'mongoose';

import { QuoteStats, QuoteStatsDoc, QuoteStatsModel } from './QuoteStats.js';

export type QuoteDoc = DocumentType<Quote>;
export type QuoteSingleQuery = DocumentQuery<QuoteDoc, QuoteDoc>;
export type QuoteMultiQuery = DocumentQuery<QuoteDoc[], QuoteDoc>;
export type QuoteDeleteQuery = Query<{ ok?: number; n?: number; deletedCount?: number;}, QuoteDoc>

export type IdOnly = { _id: string };

@plugin(AutoIncrementID, {trackerCollection: 'seq_counters', field: 'seq', startAt: 1, reference_fields: ['guild']})
@ObjectType()
export class Quote {

  // Sequencing value, unique to the guild. For referencing quotes in a list
  @prop({index: true})
  @Field()
  public seq?: number;

  // Channel ID of quoted message
  @prop({index: true})
  @Field()
  public channel: string;

  // Guild ID of quoted message
  @prop({index: true})
  @Field()
  public guild: string;

  // Message contents, in form of embed description
  @prop()
  @Field()
  public message: string;

  // User ID of quoted message author
  @prop({index: true})
  @Field()
  public author: string;

  // User ID of quote saver
  @prop()
  @Field()
  public quoter: string;

  // Image link if present in message
  @prop()
  @Field()
  public img: string;

  // URL of quoted message
  @prop({index: true})
  @Field()
  public link: string;

  // Date of quoted message
  @prop()
  @Field()
  public timestamp: Date;

  @prop({ ref: QuoteStats })
  @Field(type => QuoteStats, { nullable: true })
  public stats?: Ref<QuoteStats>;

  public getStats(): QuoteStatsDoc {
    // Only return if this.stats has been populated
    if (isDocument(this.stats)) {
      return this.stats as QuoteStatsDoc;
    } else {
      return null;
    }
  }

  public static async createwithStats(this: ReturnModelType<typeof Quote>, quote: Quote): Promise<QuoteDoc> {
    const quoteStats = await QuoteStatsModel.create({});
    quote.stats = quoteStats;
    const quoteDoc = await QuoteModel.create(quote);
    return quoteDoc;
  }

  public static getBySeq(this: ReturnModelType<typeof Quote>, guild: string, seq: number): QuoteSingleQuery {
    return this.findOne({ guild, seq }).populate('stats');
  }

  public static async getRandom(this: ReturnModelType<typeof Quote>, guild: string): Promise<QuoteDoc> {
    const id: IdOnly[] = await this.aggregate([
      { $match: { guild } }, 
      { $sample: { size: 1 } }, 
      { $project: { _id: 1 } }
    ]).exec();
    return id.length > 0 ? this.findById(id[0]).populate('stats').exec() : null;
  }
  
  public static async getRandomFromAuthor(this: ReturnModelType<typeof Quote>, 
      guild: string, author: string): Promise<QuoteDoc> {
    const id: IdOnly[] = await this.aggregate([
      { $match: { guild, author } }, 
      { $sample: { size: 1 } }, 
      { $project: { _id: 1 } }
    ]).exec();
    return id.length > 0 ? this.findById(id[0]).populate('stats').exec() : null;
  }

  public static deleteBySeq(this: ReturnModelType<typeof Quote>, guild: string, seq: number): QuoteDeleteQuery {
    return this.deleteOne({ guild, seq });
  }

  public static findByGuild(this: ReturnModelType<typeof Quote>, guild: string): QuoteMultiQuery {
    return this.find({ guild });
  }

  public static findByChannel(this: ReturnModelType<typeof Quote>, channel: string): QuoteMultiQuery {
    return this.find({ channel });
  }

  public static findByAuthor(this: ReturnModelType<typeof Quote>, author: string, guild: string): QuoteMultiQuery {
    return this.find({ author, guild });
  }

  public static checkExists(this: ReturnModelType<typeof Quote>, link: string): Promise<boolean> {
    return this.exists({ link });
  }
}

export const QuoteModel = getModelForClass(Quote);