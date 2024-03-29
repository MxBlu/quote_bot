import { envFlagOrDefault } from 'bot-framework';
import * as dotenv from 'dotenv';
dotenv.config();

// Scope of token we want to receive for REST users
export const DISCORD_REST_OAUTH_SCOPE = 'identify guilds';

// Client secret for Discord's OAuth endpoint
export const DISCORD_REST_OAUTH_SECRET = process.env.DISCORD_REST_OAUTH_SECRET

// Time between allowed encore events
export const ENCORE_QUOTE_RATELIMIT = 1500;

// Base URL for the REST server - used for OAuth
export const REST_SERVER_BASE_URL = process.env.REST_SERVER_BASE_URL;

// Base URL for the frontend - where OAuth redirects to finally
export const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL;

// Enable debug mode on GraphQL server
export const GRAPHQL_DEBUG = envFlagOrDefault("GRAPHQL_DEBUG", false);

// If token is present, bypasses authentication on GraphQL
export const GRAPHQL_AUTH_BYPASS_TOKEN = process.env.GRAPHQL_AUTH_BYPASS_TOKEN;

// Disables handling of reaction events
export const REACTION_HANDLING_DISABLED = envFlagOrDefault("REACTION_HANDLING_DISABLED", false);