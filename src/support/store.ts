import { Dependency, Logger } from 'bot-framework';
import mongoose from 'mongoose';

import { Quote, QuoteDeleteQueryResult, QuoteDoc, QuoteModel, QuoteMultiQuery, QuoteSingleQuery } from '../models/Quote.js';
import { UserModel, UserSingleQuery } from '../models/User.js';
import { Search } from './search.js';

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

  public init(mongoUri: string): void {
    this.registerMongoHandlers();

    mongoose.connect(mongoUri, 
      { autoCreate: true, autoIndex: true, useNewUrlParser: true, 
        useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true });
  }

  // Register logging handlers for Mongo events
  public registerMongoHandlers(): void {
    mongoose.connection.on('error', (err) => {  
      this.logger.error(`MongoDB error: ${err}`);
    });
  
    mongoose.connection.once('open', () => {
      this.logger.info('MongoDB connected');
      StoreDependency.ready();
    });
  }

  // Get a quote with given seq number in a certain guild
  public getQuoteBySeq(guildId: string, seq: number): QuoteSingleQuery {
    return QuoteModel.getBySeq(guildId, seq);
  }

  // Get a random quote in a certain guild
  public getRandomQuoteFromAuthor(guildId: string, authorId: string): Promise<QuoteDoc> {
    return QuoteModel.getRandomFromAuthor(guildId, authorId);
  }

  // Get a random quote in a certain guild
  public getRandomQuote(guildId: string): Promise<QuoteDoc> {
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
      img: string, link: string, timestamp: Date): Promise<QuoteDoc> {
    const quote = new Quote();
    quote.guild = guildId;
    quote.channel = channelId;
    quote.author = authorId;
    quote.quoter = quoterId;
    quote.message = message;
    quote.img = img;
    quote.link = link;
    quote.timestamp = timestamp;
    // Generate and save the quote
    let quoteModel = await QuoteModel.createwithStats(quote);
    quoteModel = await quoteModel.save();
    // Index the quote
    await Search.ingest(quoteModel);
    return quoteModel;
  }

  // Check if a quote exists with given message link
  public checkQuoteExists(link: string): Promise<boolean> {
    return QuoteModel.checkExists(link);
  }

  // Delete a quote from the db
  public async delQuote(guildId: string, seq: number): Promise<QuoteDeleteQueryResult> {
    const result = await QuoteModel.deleteBySeq(guildId, seq);
    // If deletion was successful on Mongo, delete it from the search index too
    if (result.deletedCount != null && result.deletedCount > 0) {
      await Search.remove(guildId, seq);
    }
    return result;
  }

  // Insert/update a user in the db
  public upsertUser(userId: string, guildId: string, 
      displayName: string, discriminator: string): Promise<boolean> {
    return UserModel.upsert(userId, guildId, displayName, discriminator);
  }

  // Get user from the db
  public getUser(userId: string, guildId: string): UserSingleQuery {
    return UserModel.getById(userId, guildId);
  }
 
}

export const Store = new StoreImpl();

export const StoreDependency = new Dependency("Store");