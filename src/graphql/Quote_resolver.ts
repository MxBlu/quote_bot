/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arg, Authorized, FieldResolver, Query, Resolver, Root } from "type-graphql";

import { IQuote, Quote, QuoteModel } from "../models/Quote.js";
import { QuoteStats, QuoteStatsModel } from "../models/QuoteStats.js";
import { PaginationArgs } from "./pagination.js";

@Resolver(of => Quote)
export class QuoteResolver {
  
  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async quoteBySeq(@Arg("guildId") guildId: string, @Arg("seq") seq: number): Promise<Quote> {
    return QuoteModel.getBySeq(guildId, seq);
  }

  @Authorized()
  @Query(returns => Quote, { nullable: true })
  public async randomQuote(@Arg("guildId") guildId: string): Promise<Quote> {
    return QuoteModel.getRandom(guildId);
  }

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
    return QuoteStatsModel.findById(quote.stats);
  }

}