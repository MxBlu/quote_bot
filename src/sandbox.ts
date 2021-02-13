import { Mongoose } from 'mongoose';
import Quote from './util/models/Quote';
import * as dotenv from 'dotenv';

dotenv.config();

// MongoDB
const mongoose = new Mongoose();
mongoose.connect(process.env.MONGO_URI, { autoCreate: true, autoIndex: true, useNewUrlParser: true, 
  useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true, });

async function main() {
  try {
    console.log("Start");
    const quote = await Quote.getBySeq('606704263053180929', 1);
    console.log(quote);
  } catch(err) {
    console.error(err);
  }
}

main().then(() => console.log("done")).catch(err => console.error(err));