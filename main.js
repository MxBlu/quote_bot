const Discord       = require('discord.js');
const mongoose      = require('mongoose');

require('dotenv').config();

// Logger
const verbosity = process.env.LOG_LEVEL || 3;
var logger = require('./util/logger')(verbosity);

// Inter-module messenger
var messenger = require('./util/imm')(logger);
// For discord logging of errors
logger.registerMessenger(messenger);
messenger.newTopic('newErrorLog');

// MongoDB
mongoose.connect(process.env.MONGO_URI, 
    { autoCreate: true, autoIndex: true, useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });
var db = require('./util/store')(logger);

// Discord Client
const discordToken = process.env.DISCORD_TOKEN;
var discord = new Discord.Client({ partials: [ 'GUILD_MEMBER', 'MESSAGE', 'REACTION' ] });

// Setup Discord services
require('./modules/bot')(discord, db, messenger, logger);
discord.login(discordToken);

logger.info(`Server started`);