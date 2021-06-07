import { Client as DiscordClient } from 'discord.js';
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { Store } from './util/store.js';
import { Logger } from './util/logger.js';
import { Bot } from './modules/bot.js';

dotenv.config();

// Main level logger
const logger = new Logger("Server");

// MongoDB
Store.registerMongoHandlers(); // Ensure the singleton class has been created with mongoose hooks
mongoose.connect(process.env.MONGO_URI, 
	{ autoCreate: true, autoIndex: true, useNewUrlParser: true, 
		useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true });

// Discord Client
const discordToken: string = process.env.DISCORD_TOKEN;
const discord = new DiscordClient({ partials: [ 'GUILD_MEMBER', 'MESSAGE', 'REACTION' ] });

// Setup Discord services
Bot.ensure(discord);
discord.login(discordToken);

logger.info(`Server started`);