import * as mongoose from 'mongoose';
import { Logger } from './logger';
import { Quote, QuoteModel } from './models/Quote';

/*
  API class to interact with underlying storage implementation
  In this case, MongoDB / Mongoose
*/
export class Store {
  // General logger
  logger: Logger;

  constructor (logger: Logger) {
    this.logger = logger;
    this.registerMongoHandlers();
  }

  // Register logging handlers for Mongo events
  private registerMongoHandlers(): void {
    mongoose.connection.on('error', (err: any) => {  
      this.logger.error(`MongoDB error: ${err}`);
    });
  
    mongoose.connection.once('open', () => {
      this.logger.info('MongoDB connected', 1);
    });
  }

  // Get a quote with given seq number in a certain guild
  public getQuoteBySeq (guildId: string, seq: number): Promise<Quote> {
    return QuoteModel.getBySeq(guildId, seq);
  }

  // Get a random quote in a certain guild
  public getRandomQuote (guildId: string): Promise<Quote> {
    return QuoteModel.getRandom(guildId);
  }

  // Get all quotes in a certain guild
  public getQuotesByGuild (guildId: string): Promise<Quote[]> {
    return QuoteModel.findByGuild(guildId);
  }

  // Get all quotes in a certain channel
  public getQuotesByChannel (channelId: string): Promise<Quote[]> {
    return QuoteModel.findByChannel(channelId);
  }

  // Get all quotes in by a given author in a certain guild
  public getQuotesByAuthor (userId: string, guildId: string): Promise<Quote[]> {
    return QuoteModel.findByAuthor(userId, guildId);
  }

  // Add a quote to the db
  public async addQuote(guildId: string, channelId: string,
      authorId: string, quoterId: string, message: string, 
      img: string, link: string, timestamp: Date): Promise<Quote> {
    let quote = await QuoteModel.create({
      channel: channelId,
      guild: guildId,
      message,
      author: authorId,
      quoter: quoterId,
      img,
      link,
      timestamp,
    });
    return quote.save();
  }

  // Delete a quote from the db
  // TODO: FIXME
  delQuote (guildId: string, seq: number): Promise<Quote> {
    return QuoteModel.deleteBySeq(guildId, seq);
  }

}