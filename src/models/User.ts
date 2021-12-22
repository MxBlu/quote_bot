/* eslint-disable @typescript-eslint/no-unused-vars */
import { DocumentType, getModelForClass, modelOptions, prop, ReturnModelType, Severity } from "@typegoose/typegoose";
import { DocumentQuery } from "mongoose";
import { Field, ObjectType } from "type-graphql";

export type UserSingleQuery = DocumentQuery<DocumentType<User>, DocumentType<User>>;

// Composite primary key for User
interface UserID {
  user: string; // Discord user ID
  guild: string; // Guild where user is residing
}

@ObjectType()
export class UserIDClass implements UserID {
  @Field()
  user: string;

  @Field()
  guild: string;
}

// For persisting user information in case they leave the guild or such
@modelOptions({ options: { allowMixed: Severity.ALLOW } })
@ObjectType()
export class User {
  // Primary key
  @prop()
  @Field(type => UserIDClass)
  public _id: UserID;
  
  // Guild ID of user (duplicate of _id value)
  @prop()
  @Field()
  public guild: string;
  
  // Last known display name
  @prop()
  @Field()
  public displayName: string;
  
  // Discord user discriminator
  @prop()
  @Field()
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