import * as dotenv from 'dotenv';
dotenv.config();

import { Logger } from 'bot-framework';

import { Store } from './support/store.js';
import { Bot } from './modules/bot.js';


// Main level logger
const logger = new Logger("Server");

// MongoDB
const mongoUri = process.env.MONGO_URI;
Store.init(mongoUri);

// Setup bot services
const discordToken: string = process.env.DISCORD_TOKEN;
Bot.init(discordToken);

logger.info(`Server started`);