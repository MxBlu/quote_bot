
import * as dotenv from 'dotenv';

dotenv.config();

/*
  Generic alternative main file for testing whatever needs to be tested
*/

async function main() {
  // noop
}

main().then(() => {
  console.log("done");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});