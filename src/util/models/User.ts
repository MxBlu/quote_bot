import { getModelForClass, prop, ReturnModelType } from "@typegoose/typegoose";

// We can't define the types for the DocumentQuery's correctly yet
// TODO: Revisit
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export class User {
  // Sequencing value, unique to the guild. For referencing quotes in a list
  @prop()
  public _id: { // Composite index of
    user: string, // Discord user ID
    guild: string // Guild where user is residing
  };
  
  // Guild ID of user (duplicate of _id valu)
  @prop()
  public guild: string;
  
  // Last known display name
  @prop()
  public displayName: string;
  
  // Discord user discriminator
  @prop()
  public discriminator: string;
  
  public static getById(this: ReturnModelType<typeof User>, user: string, guild: string) {
    return this.findById({ user, guild });
  }
  
  public static upsert(this: ReturnModelType<typeof User>, 
      user: string, guild: string, displayName: string, discriminator: string): Promise<User> {
    return this.updateOne(
      { _id: { user, guild } },
      { $set: { displayName, discriminator } },
      { upsert: true }
    ).exec();
  }
}

export const UserModel = getModelForClass(User);