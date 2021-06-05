
import { Quote, QuoteModel } from './util/models/Quote.js';
import * as dotenv from 'dotenv';
import * as mongoose from 'mongoose';

dotenv.config();

// MongoDB
mongoose.connect(process.env.MONGO_URI, { autoCreate: true, autoIndex: true, useNewUrlParser: true, 
  useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true, });

async function main() {
  try {
    console.log("Start");
    const quote: Quote = await QuoteModel.getBySeq('606704263053180929', 1);
    console.log(quote.author);
  } catch(err) {
    console.error(err);
  }
}

main().then(() => console.log("done")).catch(err => console.error(err));