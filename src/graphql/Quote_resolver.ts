/* eslint-disable @typescript-eslint/no-unused-vars */
import { isDocument } from "@typegoose/typegoose";
import { IsNotEmpty, ValidateIf } from "class-validator";
import { Arg, Authorized, Field, FieldResolver, InputType, Int, Query, Resolver, Root } from "type-graphql";

import { IQuote, Quote, QuoteModel } from "../models/Quote.js";
import { QuoteStats, QuoteStatsModel } from "../models/QuoteStats.js";
import { PaginationArgs } from "./pagination.js";

// Argument for 'quote' queries
@InputType()
class QuoteArgs {
  // If 'random' is not true, 'seq' must be present
  @ValidateIf(q => q.random !== true)
  @IsNotEmpty()
  @Field(type => Int, { nullable: true })
  seq?: number;

  @Field({ nullable: true })
  random?: boolean;

  @Field({ nullable: true })
  author?: string;
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
  
  /* Deprecated */
  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async quoteBySeq(@Arg("guildId") guildId: string, @Arg("seq") seq: number): Promise<Quote> {
    return QuoteModel.getBySeq(guildId, seq);
  }

  /* Deprecated */
  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async randomQuote(@Arg("guildId") guildId: string): Promise<Quote> {
    return QuoteModel.getRandom(guildId);
  }

  /* Deprecated */
  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async randomQuoteByAuthor(@Arg("guildId") guildId: string, @Arg("userId") userId: string): Promise<Quote> {
    return QuoteModel.getRandomFromAuthor(guildId, userId);
  }

  @Authorized()
  @Query(returns => [Quote], { nullable: true })
  public async quotesByGuild(@Arg("guildId") guildId: string, 
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): Promise<Quote[]> {
    return QuoteModel.findByGuild(guildId)
        .skip(options.offset).limit(options.limit);
  }

  @Authorized()
  @Query(returns => [Quote], { nullable: true })
  public async quotesByAuthor(@Arg("guildId") guildId: string, @Arg("userId") userId: string, 
      @Arg("options", { defaultValue: new PaginationArgs() }) options: PaginationArgs): Promise<Quote[]> {
    return QuoteModel.findByAuthor(userId, guildId)
        .skip(options.offset).limit(options.limit);
  }

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