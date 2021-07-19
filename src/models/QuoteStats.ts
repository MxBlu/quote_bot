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
    return this.save();
  }

}

export const QuoteStatsModel = getModelForClass(QuoteStats);