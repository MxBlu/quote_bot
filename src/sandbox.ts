import { Mongoose } from 'mongoose';
import Quote from './util/models/Quote';
import * as dotenv from 'dotenv';

dotenv.config();


// MongoDB
const mongoose = new Mongoose();
mongoose.connect(process.env.MONGO_URI, { autoCreate: true, autoIndex: true });

async function main() {
    try {
        const quote = await Quote.getBySeq('606704263053180929', 1);
        console.log(quote);
    } catch(err) {
        console.error(err);
    }
}

main();