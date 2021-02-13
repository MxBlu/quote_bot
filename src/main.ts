import { Client as DiscordClient } from 'discord.js';
import { Mongoose } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

// Logger
const verbosity : Number = Number(process.env.LOG_LEVEL) || 3;
var logger = require('./util/logger')(verbosity);

// Inter-module messenger
var messenger = require('./util/imm')(logger);
// For discord logging of errors
logger.registerMessenger(messenger);
messenger.newTopic('newErrorLog');

// MongoDB
Mongoose.connect(process.env.MONGO_URI, 
	{ autoCreate: true, autoIndex: true, useNewUrlParser: true, 
		useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true, });
var db = require('./util/store')(logger);

// Discord Client
const discordToken = process.env.DISCORD_TOKEN;
const discord = new DiscordClient({ partials: [ 'GUILD_MEMBER', 'MESSAGE', 'REACTION' ] });

// Setup Discord services
require('./modules/bot')(discord, db, messenger, logger);
discord.login(discordToken);

logger.info(`Server started`);