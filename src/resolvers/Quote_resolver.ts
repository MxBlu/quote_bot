/* eslint-disable @typescript-eslint/no-unused-vars */
import { FieldResolver, Query, Resolver, Root } from "type-graphql";

import { Quote, QuoteModel } from "../models/Quote.js";
import { QuoteStats, QuoteStatsModel } from "../models/QuoteStats.js";

@Resolver(of => Quote)
export class QuoteResolver {

    @Query(returns => [Quote])
    public async quotes(): Promise<Quote[]> {
        return await QuoteModel.find({});
    }

    @FieldResolver()
    public async stats(@Root() quote: Quote): Promise<QuoteStats> {
        return await QuoteStatsModel.findById(quote.stats);
    }

}