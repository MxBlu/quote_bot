import { Logger } from "bot-framework";
import * as crypto from "crypto";
import { APIGuild, APIUser, OAuth2Routes, RESTPostOAuth2AccessTokenResult } from "discord-api-types/v9";
import fetch from "node-fetch";

import { DISCORD_REST_OAUTH_SECRET, REST_SERVER_BASE_URL } from "../constants/constants.js";
import { QuoteBot } from "../modules/quotebot.js";
import { DiscordRESTHelper } from "./discord_rest.js";

// Stored OAuth credentials 
class StoredToken {
  // OAuth access token
  token: string;
  // OAuth refresh token
  refreshToken: string;
  // Expiry date for the token
  expiry: Date;

  constructor(accessTokenResponse: RESTPostOAuth2AccessTokenResult) {
    this.token = accessTokenResponse.access_token;
    this.refreshToken = accessTokenResponse.refresh_token;
    // Compute expiry from token duration
    this.expiry = new Date();
    this.expiry.setSeconds(this.expiry.getSeconds() + accessTokenResponse.expires_in);
  }
}

export class Session {
  // Storen OAuth token
  storedToken: StoredToken;
  // Discord API user object
  user?: APIUser;
  // Discord API guild objects
  guilds?: APIGuild[];

  // Generate a Session and populate the user and guild data
  public static async fromToken(storedToken: StoredToken): Promise<Session> {
    return {
      storedToken: storedToken,
      user: await DiscordRESTHelper.user(storedToken.token),
      guilds: await DiscordRESTHelper.guilds(storedToken.token)
    };
  }
}

// An in-memory access token store. Does what it needs to...
class SessionStoreImpl {

  sessionMap: Map<string, Session>;

  logger: Logger;

  constructor() {
    this.sessionMap = new Map();
    this.logger = new Logger("DiscordTokenStore");
  }

  // Attempt to get a token from an authorization code
  // Returns a new session ID if successful
  public async handleTokenAuth(authorizationCode: string): Promise<string> {
    // Try and get the a token with this code
    const tokenResponse = await fetch(OAuth2Routes.tokenURL, {
      method: "POST",
      body: this.generateTokenParams(authorizationCode)
    });
    
    if (tokenResponse.ok) {
      // Parse token from response
      const token = (await tokenResponse.json()) as RESTPostOAuth2AccessTokenResult;
      // Generate a session ID
      const sessionId = crypto.randomUUID();
      this.logger.trace(`Successfully retreived token: ${sessionId} ${token.access_token}`)
      // Create a StoredToken and generate a Session
      const storedToken = new StoredToken(token);
      const session = await Session.fromToken(storedToken);
      this.sessionMap.set(sessionId, session);
      // Return new session ID
      return sessionId;
    } else {
      // If the response wasn't ok, something's wrong...
      this.logger.error(`Discord OAuth token request failed: Status ${tokenResponse.status} - ${await tokenResponse.text()}`);
      return null;
    }
  }

  // Checks whether a session is logged in
  // By default, it will also refresh user and guild data as well
  // Returns whether the session has a valid token or not
  public async validateSession(sessionId: string, refreshData = true): Promise<Session> {
    // If the session ID isn't in the token map, it's been invalidated
    if (!this.sessionMap.has(sessionId)) {
      return null;
    }

    const session = this.sessionMap.get(sessionId);
    // If the token is expired, let's try to refresh it first
    if (session.storedToken.expiry < new Date()) {
      const storedToken = await this.refreshToken(session.storedToken);

      // If we didn't get a new token from it, session is invalid
      if (storedToken == null) {
        this.invalidate(sessionId);
        return null;
      }

      session.storedToken = storedToken;
      this.logger.trace(`Successfully refreshed token: ${sessionId} ${storedToken.token}`);
    }

    // Finally, request fresh user info from Discord if refreshData is specified
    try {
      if (refreshData) {
        // Will throw on Discord API exception
        session.user = await DiscordRESTHelper.user(session.storedToken.token);
        session.guilds = await DiscordRESTHelper.guilds(session.storedToken.token);
      }
      // Return the updated session
      return session;
    } catch (e) {
      // If the response wasn't ok, something's wrong...
      this.logger.error(`Discord OAuth token test failed: ${e}`);
      // Invalidate the session ID while we're at it
      this.invalidate(sessionId);
      return null;
    }
  }

  public invalidate(sessionId: string): void {
    this.sessionMap.delete(sessionId);
  }

  private async refreshToken(storedToken: StoredToken): Promise<StoredToken> {
    // Try and get the a new token
    const tokenResponse = await fetch(OAuth2Routes.tokenURL, {
      method: "POST",
      body: this.generateRefreshParams(storedToken.refreshToken)
    });
    
    if (tokenResponse.ok) {
      // Parse token from response
      const token = (await tokenResponse.json()) as RESTPostOAuth2AccessTokenResult;
      // Store the token
      const storedToken = new StoredToken(token);
      return storedToken;
    } else {
      // If the response wasn't ok, something's wrong...
      this.logger.error(`Discord OAuth token refresh failed: Status ${tokenResponse.status} - ${await tokenResponse.text()}`);
      return null;
    }
  }

  private generateTokenParams(code: string): URLSearchParams {
    // Get client ID from the Discord client on QuoteBot
    const clientId = QuoteBot.discord.application.id;
    
    // Generate the request parameters
    const params = new URLSearchParams
    params.set('client_id', clientId);
    params.set('client_secret', DISCORD_REST_OAUTH_SECRET);
    params.set('grant_type', 'authorization_code');
    params.set('code', code);
    params.set('redirect_uri', `${REST_SERVER_BASE_URL}/oauth/callback`);

    return params;
  }

  private generateRefreshParams(refreshToken: string): URLSearchParams {
    // Get client ID from the Discord client on QuoteBot
    const clientId = QuoteBot.discord.application.id;
    
    // Generate the request parameters
    const params = new URLSearchParams
    params.set('client_id', clientId);
    params.set('client_secret', DISCORD_REST_OAUTH_SECRET);
    params.set('grant_type', 'refresh_token');
    params.set('refresh_token', refreshToken);

    return params;
  }
}

export const SessionStore = new SessionStoreImpl();