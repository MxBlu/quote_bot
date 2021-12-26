/* eslint-disable @typescript-eslint/no-unused-vars */
import { isDocument } from "@typegoose/typegoose";
import { IsNotEmpty, ValidateIf } from "class-validator";
import { Arg, Authorized, Directive, Field, FieldResolver, InputType, Int, Query, Resolver, Root } from "type-graphql";

import { IQuote, Quote, QuoteModel, QuoteSortOption } from "../models/Quote.js";
import { QuoteStats, QuoteStatsModel } from "../models/QuoteStats.js";
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
  
  @Directive('@deprecated(reason: "Use `quote`")')
  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async quoteBySeq(@Arg("guildId") guildId: string, @Arg("seq") seq: number): Promise<Quote> {
    return QuoteModel.getBySeq(guildId, seq);
  }

  @Directive('@deprecated(reason: "Use `quote`")')
  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async randomQuote(@Arg("guildId") guildId: string): Promise<Quote> {
    return QuoteModel.getRandom(guildId);
  }

  @Directive('@deprecated(reason: "Use `quote`")')
  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async randomQuoteByAuthor(@Arg("guildId") guildId: string, @Arg("userId") userId: string): Promise<Quote> {
    return QuoteModel.getRandomFromAuthor(guildId, userId);
  }

  @Authorized()
  @Query(returns => [Quote], { nullable: true })
  public async quotes(@Arg("guildId") guildId: string,
      @Arg("args", { defaultValue: new QuotesArgs() }) args: QuotesArgs,
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): Promise<Quote[]> {
    if (args.search == null) {
      // Generate query from args
      const query = QuoteModel.filterFind(guildId, args.channel, args.author, 
            args.quoter, args.hasImg, args.datetime.before, args.datetime.after,
            args.sort.type, args.sort.descending);

      return query.skip(options.offset).limit(options.limit);
    } else {
      // TODO: Implement search
      throw new Error("Search not implemented");
    }
  }

  @Directive('@deprecated(reason: "Use `quotes`")')
  @Authorized()
  @Query(returns => [Quote], { nullable: true })
  public async quotesByGuild(@Arg("guildId") guildId: string, 
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): Promise<Quote[]> {
    return QuoteModel.findByGuild(guildId)
        .skip(options.offset).limit(options.limit);
  }

  @Directive('@deprecated(reason: "Use `quotes`")')
  @Authorized()
  @Query(returns => [Quote], { nullable: true })
  public async quotesByAuthor(@Arg("guildId") guildId: string, @Arg("userId") userId: string, 
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): Promise<Quote[]> {
    return QuoteModel.findByAuthor(userId, guildId)
        .skip(options.offset).limit(options.limit);
  }

  @Directive('@deprecated(reason: "Use `quotes`")')
  @Authorized()
  @Query(returns => [Quote], { nullable: true })
  public async quotesByChannel(@Arg("channelId") channelId: string, 
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): Promise<Quote[]> {
    return QuoteModel.findByChannel(channelId)
        .skip(options.offset).limit(options.limit);
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