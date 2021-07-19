import { DocumentType, getModelForClass, prop } from '@typegoose/typegoose';

export type QuoteStatsDoc = DocumentType<QuoteStats>;

export class QuoteStats {
  // User IDs represent view events, non-unique
  @prop({ type: String, default: [] })
  public views?: string[];

  // User IDs representing likes, unique
  @prop({ type: String, default: [] })
  public likes?: string[];

  // User IDs representing likes, unique
  @prop({ type: String, default: [] })
  public dislikes?: string[];

  public async addView(this: QuoteStatsDoc, user: string): Promise<QuoteStatsDoc> {
    // Add user to view
    this.views.push(user);
    // quoteStats.markModified('views');
    return this.save();
  }
  
  public async toggleLike(this: QuoteStatsDoc, user: string): Promise<QuoteStatsDoc> {
    // Convert arrays to Sets, easily to work with uniqueness
    const likes = new Set(this.likes);
    const dislikes = new Set(this.dislikes);

    // Toggle presence of <user> in likes
    // Remove <user> from dislikes too if present
    if (likes.has(user)) {
        likes.delete(user);
    } else {
        dislikes.delete(user);
        likes.add(user);
    }

    // Update and return QuoteStats object
    this.likes = Array.from(likes);
    this.dislikes = Array.from(dislikes);
    // this.markModified('likes');
    // this.markModified('dislikes');
    return this.save();
  }

  public async toggleDislike(this: QuoteStatsDoc, user: string): Promise<QuoteStatsDoc> {
    // Convert arrays to Sets, easily to work with uniquely
    const likes = new Set(this.likes);
    const dislikes = new Set(this.dislikes);
    
    // Toggle presence of <user> in dislikes
    // Remove <user> from likes too if present
    if (dislikes.has(user)) {
        dislikes.delete(user);
    } else {
        likes.delete(user);
        dislikes.add(user);
    }

    // Update and return QuoteStats object
    this.likes = Array.from(likes);
    this.dislikes = Array.from(dislikes);
    // quoteStats.markModified('likes');
    // quoteStats.markModified('dislikes');
    return this.save();
  }

//   public static async ensureLike(this: ReturnModelType<typeof QuoteStats>, quote: Quote, user: string): Promise<QuoteStatsDoc> {
//     // Get QuoteStats object for given quote, throw Error if not found
//     const quoteStats = await this.getByQuote(quote).exec();
//     if (quoteStats == null) {
//         throw new Error(`No QuoteStats object for Quote { ${quote.guild} => ${quote.seq} }`);
//     }

//     const likes = new Set(quoteStats.likes);
//     const dislikes = new Set(quoteStats.dislikes);
//     dislikes.delete(user);
//     likes.add(user);

//     // Update and return QuoteStats object
//     quoteStats.likes = Array.from(likes);
//     quoteStats.dislikes = Array.from(dislikes);
//     // quoteStats.markModified('likes');
//     // quoteStats.markModified('dislikes');
//     return quoteStats.save();
//   }

//   public static async ensureDislike(this: ReturnModelType<typeof QuoteStats>, quote: Quote, user: string): Promise<QuoteStatsDoc> {
//     // Get QuoteStats object for given quote, throw Error if not found
//     const quoteStats = await this.getByQuote(quote).exec();
//     if (quoteStats == null) {
//         throw new Error(`No QuoteStats object for Quote { ${quote.guild} => ${quote.seq} }`);
//     }

//     const likes = new Set(quoteStats.likes);
//     const dislikes = new Set(quoteStats.dislikes);
//     likes.delete(user);
//     dislikes.add(user);

//     // Update and return QuoteStats object
//     quoteStats.likes = Array.from(likes);
//     quoteStats.dislikes = Array.from(dislikes);
//     // quoteStats.markModified('likes');
//     // quoteStats.markModified('dislikes');
//     return quoteStats.save();
//   }

}

export const QuoteStatsModel = getModelForClass(QuoteStats);