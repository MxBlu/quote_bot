
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

import { Quote, QuoteModel } from './util/models/Quote.js';
import { Store } from './util/store.js';

// MongoDB
Store.registerMongoHandlers();
mongoose.connect(process.env.MONGO_URI, { autoCreate: true, autoIndex: true, useNewUrlParser: true, 
  useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true, });

async function main() {
  try {
    console.log("Start");
    const quote: Quote = await Store.addQuote("test2", "test", "test", "test", "test", "test", "test", new Date());
    console.log(quote);
  } catch(err) {
    console.error(err);
  }
}

main().then(() => console.log("done")).catch(err => console.error(err));