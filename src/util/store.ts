import mongoose from 'mongoose';
import { randomInt } from 'node:crypto';
import { Logger } from './logger.js';
import { Quote, QuoteDeleteQuery, QuoteModel, QuoteMultiQuery, QuoteSingleQuery } from './models/Quote.js';
import { User, UserModel, UserSingleQuery } from './models/User.js';

/*
  API class to interact with underlying storage implementation
  In this case, MongoDB / Mongoose
*/
class StoreImpl {

  // General logger
  logger: Logger;

  constructor () {
    this.logger = new Logger("Store");
  }

  // Register logging handlers for Mongo events
  public registerMongoHandlers(): void {
    mongoose.connection.on('error', (err) => {  
      this.logger.error(`MongoDB error: ${err}`);
    });
  
    mongoose.connection.once('open', () => {
      this.logger.info('MongoDB connected', 1);
    });
  }

  // Get a quote with given seq number in a certain guild
  public getQuoteBySeq(guildId: string, seq: number): QuoteSingleQuery {
    return QuoteModel.getBySeq(guildId, seq);
  }

  // Get a random quote in a certain guild
  public getRandomQuoteFromAuthor(guildId: string, authorId: string): Promise<Quote> {
    return QuoteModel.getRandomFromAuthor(guildId, authorId);
  }

  // Get a random quote in a certain guild
  public getRandomQuote(guildId: string): Promise<Quote> {
    return QuoteModel.getRandom(guildId);
  }

  // Get all quotes in a certain guild
  public getQuotesByGuild(guildId: string): QuoteMultiQuery {
    return QuoteModel.findByGuild(guildId);
  }

  // Get all quotes in a certain channel
  public getQuotesByChannel(channelId: string): QuoteMultiQuery {
    return QuoteModel.findByChannel(channelId);
  }

  // Get all quotes in by a given author in a certain guild
  public getQuotesByAuthor(userId: string, guildId: string): QuoteMultiQuery {
    return QuoteModel.findByAuthor(userId, guildId);
  }

  // Clones a given multi-result query
  public cloneQuoteQuery(query: QuoteMultiQuery): QuoteMultiQuery {
    return QuoteModel.find().merge(query);
  }

  // Add a quote to the db
  public async addQuote(guildId: string, channelId: string,
      authorId: string, quoterId: string, message: string, 
      img: string, link: string, timestamp: Date): Promise<Quote> {
    const quote = await QuoteModel.create({
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

  // Check if a quote exists with given message link
  public checkQuoteExists (link: string): Promise<boolean> {
    return QuoteModel.checkExists(link);
  }

  // Delete a quote from the db
  public delQuote(guildId: string, seq: number): QuoteDeleteQuery {
    return QuoteModel.deleteBySeq(guildId, seq);
  }

  // Insert/update a user in the db
  public upsertUser(userId: string, guildId: string, 
      displayName: string, discriminator: string): Promise<User> {
    return UserModel.upsert(userId, guildId, displayName, discriminator);
  }

  // Get user from the db
  public getUser(userId: string, guildId: string): UserSingleQuery {
    return UserModel.getById(userId, guildId);
  }
 
}

export const Store = new StoreImpl();