import { GraphQLScalarType, Kind } from "graphql";
import mongoose from 'mongoose';

export const ObjectIdScalar = new GraphQLScalarType({
  name: "ObjectId",
  description: "Mongo object id scalar type",
  serialize(value: unknown): string {
    if (!(value instanceof mongoose.Types.ObjectId)) {
      throw new Error("ObjectIdScalar can only serialize ObjectId values");
    }
    // Convert ObjectId to string
    // toHexString() exists but typing makes it hard...
    return String(value);
  },
  parseValue(value: unknown): mongoose.Types.ObjectId {
    if (typeof value !== "string") {
      throw new Error("ObjectIdScalar can only parse string values");
    }
    return mongoose.Types.ObjectId(value);
  },
  parseLiteral(ast): mongoose.Types.ObjectId {
    if (ast.kind !== Kind.STRING) {
      throw new Error("ObjectIdScalar can only parse string values");
    }
    return mongoose.Types.ObjectId(ast.value);
  },
});