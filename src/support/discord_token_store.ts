import { Logger } from "bot-framework";
import * as crypto from "crypto";
import { OAuth2Routes, RESTPostOAuth2AccessTokenResult, Routes } from "discord-api-types/v9";
import fetch from "node-fetch";

import { DISCORD_REST_OAUTH_SECRET, REST_SERVER_BASE_URL } from "../constants/constants.js";
import { QuoteBot } from "../modules/quotebot.js";
import { DiscordRESTHelper } from "./discord_rest.js";

export class StoredToken {
  token: string;

  refreshToken: string;

  expiry: Date;

  constructor(accessTokenResponse: RESTPostOAuth2AccessTokenResult) {
    this.token = accessTokenResponse.access_token;
    this.refreshToken = accessTokenResponse.refresh_token;
    // Compute expiry
    this.expiry = new Date();
    this.expiry.setSeconds(this.expiry.getSeconds() + accessTokenResponse.expires_in);
  }
}

// An in-memory access token store. Does what it needs to...
class DiscordTokenStoreImpl {

  tokenMap: Map<string, StoredToken>;

  logger: Logger;

  constructor() {
    this.tokenMap = new Map();
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
      // Store the token
      this.tokenMap.set(sessionId, new StoredToken(token));
      // Return session ID
      return sessionId;
    } else {
      // If the response wasn't ok, something's wrong...
      this.logger.error(`Discord OAuth token request failed: Status ${tokenResponse.status} - ${await tokenResponse.text()}`);
      return null;
    }
  }

  // Checks whether a session is logged in
  // Returns whether the session has a valid token or not
  public async validateSession(sessionId: string): Promise<string> {
    // If the session ID isn't in the token map, it's been invalidated
    if (!this.tokenMap.has(sessionId)) {
      return null;
    }

    let storedToken = this.get(sessionId);
    // If the token is expired, let's try to refresh it first
    if (storedToken.expiry < new Date()) {
      storedToken = await this.refreshToken(sessionId);

      // If we didn't get a new token from it, session is invalid
      if (storedToken == null) {
        return null;
      }
    }

    // Finally, do a test request to make sure it's valid
    try {
      // Will throw on Discord API exception
      await DiscordRESTHelper.user(storedToken.token);
      // Success, return this token
      return storedToken.token;
    } catch (e) {
      // If the response wasn't ok, something's wrong...
      this.logger.error(`Discord OAuth token test failed: ${e}`);
      // Invalidate the session ID while we're at it
      this.invalidate(sessionId);
      return null;
    }
  }

  public get(sessionId: string): StoredToken {
    return this.tokenMap.get(sessionId);
  }

  public invalidate(sessionId: string): void {
    this.tokenMap.delete(sessionId);
  }

  private async refreshToken(sessionId: string): Promise<StoredToken> {
    const token = this.tokenMap.get(sessionId);

    // Try and get the a new token
    const tokenResponse = await fetch(OAuth2Routes.tokenURL, {
      method: "POST",
      body: this.generateRefreshParams(token.refreshToken)
    });
    
    if (tokenResponse.ok) {
      // Parse token from response
      const token = (await tokenResponse.json()) as RESTPostOAuth2AccessTokenResult;
      this.logger.trace(`Successfully refreshed token: ${sessionId} ${token.access_token}`)
      // Store the token
      const storedToken = new StoredToken(token);
      this.tokenMap.set(sessionId, storedToken);
      return storedToken;
    } else {
      // If the response wasn't ok, something's wrong...
      this.logger.error(`Discord OAuth token refresh failed: Status ${tokenResponse.status} - ${await tokenResponse.text()}`);
      // Invalidate the session ID while we're at it
      this.invalidate(sessionId);
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

export const DiscordTokenStore = new DiscordTokenStoreImpl();