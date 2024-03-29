/* eslint-disable @typescript-eslint/no-unused-vars */
import { isDocument } from "@typegoose/typegoose";
import { IsNotEmpty, ValidateIf } from "class-validator";
import { Arg, Authorized, Field, FieldResolver, InputType, Int, ObjectType, Query, Resolver, Root } from "type-graphql";

import { IQuote, isAggregate, isDocumentQuery, Quote, QuoteModel, QuoteSortOption } from "../models/Quote.js";
import { QuoteStats, QuoteStatsModel } from "../models/QuoteStats.js";
import { Search } from "../support/search.js";
import { PaginationArgs } from "./pagination.js";

// Argument for 'quote' queries
@InputType()
class QuoteArgs {
  // If 'random' is not true, 'seq' must be present
  @ValidateIf(q => q.random !== true)
  @IsNotEmpty()
  @Field(type => Int, { nullable: true })
  // Seq number of quote
  seq?: number;

  @Field(type => Boolean)
  // Get a random quote
  random = false;

  @Field({ nullable: true })
  // Author filter if random quote
  author?: string;
}

@InputType()
class QuoteDatetimeArgs {
  @Field({ nullable: true })
  // Get Quotes before provided date
  before?: Date;
  
  @Field({ nullable: true })
  // Get Quotes after provided date
  after?: Date;
}

@InputType()
class QuoteSortArgs {
  @Field(type => QuoteSortOption)
  // Type of sort to use
  type = QuoteSortOption.DEFAULT;

  @Field(type => Boolean)
  // Sort direction
  descending = false;
}

// Argument for 'quotes' queries
@InputType()
class QuotesArgs { 
  @Field({ nullable: true })
  // Search string
  search?: string;

  @Field({ nullable: true })
  // Filter to specified channel
  channel?: string;
  
  @Field({ nullable: true })
  // Filter to specified author
  author?: string;
  
  @Field({ nullable: true })
  // Filter to specified quoter
  quoter?: string;
  
  @Field({ nullable: true })
  // Filter for if the quote has an image
  hasImg?: boolean;

  @Field(type => QuoteDatetimeArgs)
  // Filter for a time range
  datetime = new QuoteDatetimeArgs();

  @Field(type => QuoteSortArgs)
  // Sort parameters
  sort = new QuoteSortArgs();
}

// Output type for paginated quote queries
@ObjectType()
export class QuotesQueryResponse {
  @Field(type => [Quote])
  results: Quote[];

  @Field()
  totalResultCount: number;
}

// Type for the result of a Model.aggregate([]).count('count') query
type AggregateCountResult = [ { count: number }? ];

@Resolver(of => Quote)
export class QuoteResolver {

  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async quote(@Arg("guildId") guildId: string, @Arg("args") args: QuoteArgs): Promise<Quote> {
    if (args.seq) {
      return QuoteModel.getBySeq(guildId, args.seq);
    } else {
      return QuoteModel.getRandom(guildId, args.author);
    }
  }

  @Authorized()
  @Query(returns => QuotesQueryResponse)
  public async quotes(@Arg("guildId") guildId: string,
      @Arg("args", { defaultValue: new QuotesArgs() }) args: QuotesArgs,
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): Promise<QuotesQueryResponse> {
    // If a text query exists, do a text search first
    let idFilter: number[] = null;
    if (args.search != null) {
      idFilter = await Search.search(guildId, args.search);
    }
    // Generate query from args
    const query = QuoteModel.filterFind(guildId, args.channel, args.author, 
          args.quoter, args.hasImg, args.datetime.before, args.datetime.after,
          idFilter, args.sort.type, args.sort.descending);

    // If we have a text query and the sort is "DEFAULT", we need to approach this differently
    if (idFilter != null && args.sort.type == QuoteSortOption.DEFAULT) {
      // Get all the results for the query "unsorted" (really sorted by time but irrelevant)
      let results = await query;
      // Get total result count
      const totalResultCount = results.length;
      // Sort the results array in-place
      // Order is determined by relative position in idFilter array
      // If descending sort is requested, invert the sorting
      // TODO: should descending sort even be considered..? it's not meaningful
      results.sort((a, b) =>
        (idFilter.indexOf(a.seq) - idFilter.indexOf(b.seq)) * (args.sort.descending ? -1 : 1));
      // Apply offset and limit
      results = results.slice(options.offset, options.offset + options.limit);
      // Return as a total result count and 
      return {
        results: results,
        totalResultCount: totalResultCount
      };
    } else {
      // Execute a cloned query to get result count
      let totalResultCount = 0;
      // Count is acquired by different means for aggregates and queries...
      if (isAggregate(query)) {
        const countResp 
          = await QuoteModel.aggregate(query.pipeline()).count("count") as unknown as AggregateCountResult;
        totalResultCount = countResp[0]?.count ?? 0;
      } else if (isDocumentQuery(query)) {
        totalResultCount = await QuoteModel.find().merge(query).countDocuments();
      }
      // Execute the query with offset and limit for the actual results
      const results = await query.skip(options.offset).limit(options.limit);
      return {
        results: results,
        totalResultCount: totalResultCount
      };
    }
  }

  @FieldResolver()
  public async stats(@Root() quote: IQuote): Promise<QuoteStats> {
    // If stats is already resolved, just return the resolved value
    //  otherwise, fetch it from the DB
    return isDocument(quote.stats) 
        ? quote.stats 
        : QuoteStatsModel.findById(quote.stats);
  }

}