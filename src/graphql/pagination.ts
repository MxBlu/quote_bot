/* eslint-disable @typescript-eslint/no-unused-vars */
import { Field, InputType, Int } from "type-graphql";

// Common args for query pagination
@InputType()
export class PaginationArgs {
  @Field(type => Int)
  offset = 0;

  @Field(type => Int)
  limit = 10;
}