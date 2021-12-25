/* eslint-disable @typescript-eslint/no-unused-vars */
import { Field, InputType, Int } from "type-graphql";

// Common args for query pagination
@InputType()
export class PaginationArgs {
  @Field(type => Int, { defaultValue: 0 })
  offset = 0;

  @Field(type => Int,{ defaultValue: 10 })
  limit = 10;
}