/* eslint-disable @typescript-eslint/no-unused-vars */
import { DocumentType, getModelForClass, isDocument, plugin, prop, Ref, ReturnModelType } from '@typegoose/typegoose';
import { AutoIncrementID } from '@typegoose/auto-increment';
import { Field, ObjectType, registerEnumType } from 'type-graphql';
import { Aggregate, DocumentQuery, Query } from 'mongoose';

import { QuoteStats, QuoteStatsDoc, QuoteStatsModel } from './QuoteStats.js';

export type QuoteDoc = DocumentType<Quote>;
export type QuoteSingleQuery = DocumentQuery<QuoteDoc, QuoteDoc>;
export type QuoteMultiQuery = DocumentQuery<QuoteDoc[], QuoteDoc>;
export type QuoteAggregate = Aggregate<QuoteDoc[]>;
export type QuoteDeleteQueryResult = { ok?: number; n?: number; deletedCount?: number; };
export type QuoteDeleteQuery = Query<QuoteDeleteQueryResult, QuoteDoc>

interface IdOnly { 
  _id: string 
}

interface RandomQueryFilter {
  guild: string;
  author?: string;
}

interface QuotesFilter {
  guild: string;
  seq?: { $in: number[] }; // Used in conjunction with text search results
  channel?: string;
  author?: string;
  quoter?: string;
  img?: { $ne: null } | null; // If 'img' exists, make it a null check
  timestamp?: { $gte?: Date, $lt?: Date };
  stats?: { $ne: null }; // Used to filter out quotes without stats for stats filter
}

export enum QuoteSortOption {
  DEFAULT,
  TIME,
  LIKE,
  DISLIKE,
  VIEW
}

// Register the type with TypeGraphQL for reflection
registerEnumType(QuoteSortOption, {
  name: "QuoteSortOption"
});

// Interface for external use
export interface IQuote {
  seq?: number;
  channel: string;
  guild: string;
  message: string;
  author: string;
  quoter: string;
  img?: string;
  link: string;
  timestamp: Date;
  stats?: Ref<QuoteStats>;
}


@plugin(AutoIncrementID, {trackerCollection: 'seq_counters', field: 'seq', startAt: 1, reference_fields: ['guild']})
@ObjectType()
export class Quote implements IQuote {

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
  @Field({ nullable: true })
  public img?: string;

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

  public static async getRandom(this: ReturnModelType<typeof Quote>, guild: string, author?: string): Promise<QuoteDoc> {
    // Generate match filter from args
    const matchFilter: RandomQueryFilter = { guild: guild };
    if (author != null) {
      matchFilter.author = author;
    }

    // Fetch the ID for a random quote matching the filter
    const id: IdOnly[] = await this.aggregate([
      { $match: matchFilter }, 
      { $sample: { size: 1 } }, 
      { $project: { _id: 1 } }
    ]).exec();
    // Fetch the full quote document and populate the stats field
    return id.length > 0 ? this.findById(id[0]).populate('stats').exec() : null;
  }
  
  /* Deprecated */
  public static async getRandomFromAuthor(this: ReturnModelType<typeof Quote>, 
      guild: string, author: string): Promise<QuoteDoc> {
    const id: IdOnly[] = await this.aggregate([
      { $match: { guild, author } }, 
      { $sample: { size: 1 } }, 
      { $project: { _id: 1 } }
    ]).exec();
    return id.length > 0 ? this.findById(id[0]).populate('stats').exec() : null;
  }

  public static filterFind(this: ReturnModelType<typeof Quote>, guild: string, 
      channel?: string, author?: string, quoter?: string, hasImg?: boolean,
      before?: Date, after?: Date, idFilter?: number[], sortKey?: QuoteSortOption, 
      descending = false): QuoteMultiQuery | QuoteAggregate {
    // Generate filter from args
    const filter: QuotesFilter = { guild: guild };
    if (channel != null) {
      filter.channel = channel;
    }
    if (author != null) {
      filter.author = author;
    }
    if (quoter != null) {
      filter.quoter = quoter;
    }
    if (hasImg != null) {
      filter.img = hasImg ? { $ne: null } : null;
    }
    if (before != null || after != null) {
      filter.timestamp = {};
      if (before != null) {
        filter.timestamp.$lt = before;
      }
      if (after != null) {
        filter.timestamp.$gte = after;
      }
    }
    if (idFilter != null) {
      filter.seq = { $in: idFilter };
    }

    let query: QuoteMultiQuery | QuoteAggregate = null;
    if (sortKey == QuoteSortOption.LIKE || 
        sortKey == QuoteSortOption.DISLIKE || 
        sortKey == QuoteSortOption.VIEW) {
      // These sort options require an aggregate instead of a simple find
      // Determine field to sort on based on sortKey
      const sortField =
          sortKey == QuoteSortOption.LIKE ? "$stats.likes" :
          sortKey == QuoteSortOption.DISLIKE ? "$stats.dislikes" :
          "$stats.views";
      // Filter out quotes without stats - breaks pipeline
      // filter.stats = { $ne: null };
      // Build aggregate pipeline to merge in stats and sort the object
      query = this.aggregate([
        { $match: filter }, // Filter to quotes we care about
        { $lookup: { 
          from: 'quotestats',
          localField: 'stats',
          foreignField: '_id',
          as: 'stats' } }, // Join the 'stats' object
        { $unwind: '$stats' }, // Unwind the above since its an array
        { $addFields: { sortCount: { $size: sortField } } }, // Add in an aggregate field to sort by
        { $sort: { sortCount: descending ? -1 : 1 } } // Do the actual sort
      ]) as QuoteAggregate;

    } else {
      // Query can be a simple find
      query = this.find(filter);
 
      // DEFAULT sort = TIME sort, which is the default operation on Mongo
      // Only worry if descending is true
      if (descending) {
        query = query.sort({ _id: -1 });
      }
    }

    return query;
  }

  /* Deprecated */
  public static findByGuild(this: ReturnModelType<typeof Quote>, guild: string): QuoteMultiQuery {
    return this.find({ guild });
  }

  /* Deprecated */
  public static findByChannel(this: ReturnModelType<typeof Quote>, channel: string): QuoteMultiQuery {
    return this.find({ channel });
  }

  /* Deprecated */
  public static findByAuthor(this: ReturnModelType<typeof Quote>, author: string, guild: string): QuoteMultiQuery {
    return this.find({ author, guild });
  }

  public static deleteBySeq(this: ReturnModelType<typeof Quote>, guild: string, seq: number): QuoteDeleteQuery {
    return this.deleteOne({ guild, seq });
  }

  public static checkExists(this: ReturnModelType<typeof Quote>, link: string): Promise<boolean> {
    return this.exists({ link });
  }
}

export const QuoteModel = getModelForClass(Quote);