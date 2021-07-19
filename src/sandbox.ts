
import * as dotenv from 'dotenv';

dotenv.config();

import { Quote } from './models/Quote.js';
import { Store, StoreDependency } from './support/store.js';

// MongoDB
Store.init(process.env.MONGO_URI);

async function main() {
  try {
    await StoreDependency.await();
    await Store.addQuote("test2", "test", "test", "test", "test", "test", "test", new Date());
    const quote: Quote = await Store.getRandomQuote("test2");
    const stats = quote.getStats();
    console.log(quote);
  } catch(err) {
    console.error(err);
  }
}

main().then(() => {
  console.log("done");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});