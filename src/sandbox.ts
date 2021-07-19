
import * as dotenv from 'dotenv';

dotenv.config();

import { Quote } from './models/Quote.js';
import { Store, StoreDependency } from './support/store.js';

// MongoDB
Store.init(process.env.MONGO_URI);

async function main() {
  try {
    await StoreDependency.await();
    const quote: Quote = await Store.getQuoteBySeq("test2", 2);
    const stats = quote.getStats();
    await stats.toggleDislike("testUser");
    await stats.toggleDislike("testUser2");
    await stats.toggleLike("testUser3");
    await stats.toggleLike("testUser4");
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