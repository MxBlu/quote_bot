import { DocumentType, getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { DocumentQuery } from "mongoose";

export type UserSingleQuery = DocumentQuery<DocumentType<User>, DocumentType<User>>;

// For persisting user information in case they leave the guild or such
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
export class User {
  // Sequencing value, unique to the guild. For referencing quotes in a list
  @prop()
  public _id: { // Composite index of
    user: string, // Discord user ID
    guild: string // Guild where user is residing
  };
  
  // Guild ID of user (duplicate of _id value)
  @prop()
  public guild: string;
  
  // Last known display name
  @prop()
  public displayName: string;
  
  // Discord user discriminator
  @prop()
  public discriminator: string;
  
  public static getById(this: ReturnModelType<typeof User>, user: string, guild: string): UserSingleQuery {
    return this.findById({ user, guild });
  }
  
  public static async upsert(this: ReturnModelType<typeof User>, 
      user: string, guild: string, displayName: string, discriminator: string): Promise<boolean> {
    const result = await this.updateOne(
      { _id: { user, guild } },
      { $set: { displayName, discriminator } },
      { upsert: true }
    ).exec();
    return result.ok == 1;
  }
}

export const UserModel = getModelForClass(User);