import mongoose from 'mongoose';
import { Logger } from './logger.js';
import { Quote, QuoteModel } from './models/Quote.js';
import { User, UserModel } from './models/User.js';

/*
  API class to interact with underlying storage implementation
  In this case, MongoDB / Mongoose
*/

// We can't define the types for the DocumentQuery's correctly yet
// TODO: Revisit
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export class Store {

  // Singleton instance
  private static _instance: Store;

  // Create a Store if one is not present
  public static ensure(): void {
    if (this._instance == null) {
      this._instance = new Store();
    }
  }

  // Return singleton instance
  public static get(): Store {
    return this._instance;
  }

  // General logger
  logger: Logger;

  constructor () {
    this.logger = new Logger("Store");
    this.registerMongoHandlers();
  }

  // Register logging handlers for Mongo events
  private registerMongoHandlers(): void {
    mongoose.connection.on('error', (err) => {  
      this.logger.error(`MongoDB error: ${err}`);
    });
  
    mongoose.connection.once('open', () => {
      this.logger.info('MongoDB connected', 1);
    });
  }

  // Get a quote with given seq number in a certain guild
  public getQuoteBySeq(guildId: string, seq: number) {
    return QuoteModel.getBySeq(guildId, seq);
  }

  // Get a random quote in a certain guild
  public getRandomQuoteFromAuthor(guildId: string, authorId: string) {
    return QuoteModel.getRandomFromAuthor(guildId, authorId);
  }

  // Get a random quote in a certain guild
  public getRandomQuote(guildId: string) {
    return QuoteModel.getRandom(guildId);
  }

  // Get all quotes in a certain guild
  public getQuotesByGuild(guildId: string) {
    return QuoteModel.findByGuild(guildId);
  }

  // Get all quotes in a certain channel
  public getQuotesByChannel(channelId: string) {
    return QuoteModel.findByChannel(channelId);
  }

  // Get all quotes in by a given author in a certain guild
  public getQuotesByAuthor(userId: string, guildId: string) {
    return QuoteModel.findByAuthor(userId, guildId);
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
  public checkQuoteExists (link: string) {
    return QuoteModel.checkExists(link);
  }

  // Delete a quote from the db
  public delQuote(guildId: string, seq: number) {
    return QuoteModel.deleteBySeq(guildId, seq);
  }

  // Insert/update a user in the db
  public upsertUser(userId: string, guildId: string, 
      displayName: string, discriminator: string): Promise<User> {
    return UserModel.upsert(userId, guildId, displayName, discriminator);
  }

  // Get user from the db
  public getUser(userId: string, guildId: string) {
    return UserModel.getById(userId, guildId);
  }
 
}