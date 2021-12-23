/* eslint-disable @typescript-eslint/no-unused-vars */
import { Arg, Authorized, FieldResolver, Query, Resolver, Root } from "type-graphql";

import { IQuote, Quote, QuoteModel } from "../models/Quote.js";
import { QuoteStats, QuoteStatsModel } from "../models/QuoteStats.js";

@Resolver(of => Quote)
export class QuoteResolver {
    
    // @Authorized()
    @Query(returns => Quote)
    public async quoteBySeq(@Arg("guildId") guildId: string, @Arg("seq") seq: number): Promise<Quote> {
        return QuoteModel.getBySeq(guildId, seq);
    }

    @Query(returns => Quote)
    public async randomQuote(@Arg("guildId") guildId: string): Promise<Quote> {
        return QuoteModel.getRandom(guildId);
    }

    @Query(returns => Quote)
    public async randomQuoteByAuthor(@Arg("guildId") guildId: string, @Arg("userId") userId: string): Promise<Quote> {
        return QuoteModel.getRandomFromAuthor(guildId, userId);
    }

    @Query(returns => [Quote])
    public async quotesByGuild(@Arg("guildId") guildId: string): Promise<Quote[]> {
        return QuoteModel.findByGuild(guildId);
    }

    @Query(returns => [Quote])
    public async quotesByAuthor(@Arg("guildId") guildId: string, @Arg("userId") userId: string): Promise<Quote[]> {
        return QuoteModel.findByAuthor(userId, guildId);
    }

    @Query(returns => [Quote])
    public async quotesByChannel(@Arg("channelId") channelId: string): Promise<Quote[]> {
        return QuoteModel.findByChannel(channelId);
    }

    @FieldResolver()
    public async stats(@Root() quote: IQuote): Promise<QuoteStats> {
        return QuoteStatsModel.findById(quote.stats);
    }

}