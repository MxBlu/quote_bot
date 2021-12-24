import * as dotenv from 'dotenv';
dotenv.config();

import { Logger } from 'bot-framework';

import { Store } from './support/store.js';
import { QuoteBot } from './modules/quotebot.js';
import { GraphQLServer } from './modules/graphql_server.js';
import { RESTServer } from './modules/rest_server.js';

// Main level logger
const logger = new Logger("Server");

// MongoDB
const mongoUri = process.env.MONGO_URI;
Store.init(mongoUri);

// Setup bot services
const discordToken: string = process.env.DISCORD_TOKEN;
QuoteBot.init(discordToken);

// Setup GraphQL server
const graphqlPort = parseInt(process.env.GRAPHQL_PORT);
GraphQLServer.init(graphqlPort);

// Setup REST server
const restPort = parseInt(process.env.REST_PORT);
RESTServer.init(restPort);

// Set logger to handle global rejections
logger.registerAsGlobal();
logger.info(`Server started`);