import { Logger } from "bot-framework";
import cookieParser from "cookie-parser";
import { OAuth2Routes } from "discord-api-types/v9";
import { Permissions, PermissionString } from "discord.js";
import express, { Application, NextFunction, Request, Response } from "express";

import { DISCORD_REST_OAUTH_SCOPE, FRONTEND_BASE_URL, REST_SERVER_BASE_URL } from "../constants/constants.js";
import { DiscordRESTHelper } from "../support/discord_rest.js";
import { DiscordTokenStore } from "../support/discord_token_store.js";
import { QuoteBot, QuoteBotDependency } from "./quotebot.js";

class RESTServerImpl {

  server: Application;

  logger: Logger;

  constructor() {
    this.logger = new Logger("RESTServer");
  }

  public async init(port: number): Promise<void> {
    this.server = express();

    // Add middleware - logging and server state
    this.server.use(this.onRequest);
    this.server.use(cookieParser());
    // Create routes 
    this.addRoutes();
    // Add error handler
    this.server.use(this.onError);

    this.server.listen(port);
    this.logger.debug(`Server running on port ${port}`);
  }

  private addRoutes(): void {
    this.server.get('/identify', this.onIdentify);
    this.server.get('/guilds', this.onGuilds);
    this.server.get('/login', this.onLogin);
    this.server.get('/oauth/callback', this.onOauthCallback);
  }

  private generateAuthorizationUrl(): string {
    // Get client ID from the Discord client on QuoteBot
    const clientId = QuoteBot.discord.application.id;
    
    // Generate the params
    const url = new URL(OAuth2Routes.authorizationURL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', `${REST_SERVER_BASE_URL}/oauth/callback`);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('prompt', 'none'); // No need to get consent again
    url.searchParams.set('scope', DISCORD_REST_OAUTH_SCOPE); // Fixed scope - we shouldn't need it larger

    return url.toString();
  }
  
  // Middleware

  private onRequest = (req: Request, res: Response, next: NextFunction): void => {
    // If QuoteBot isn't loaded yet, return a 500
    if (!QuoteBotDependency.isReady()) {
      res.status(500).json({
        error: "Server is not ready"
      });
      return;
    }

    // Log request paths with IPs
    // TODO: Adjust for reverse proxy
    this.logger.info(`Request: ${req.path} - ${req.ip}`);
    next();
  };

  private onError = (err: Error, req: Request, res: Response) => {
    // Log the error and return a 500
    this.logger.error(`Error processing request: ${req.path} - ${err}`);
    res.sendStatus(500);
  }

  // Route handlers
  // TODO: Send error responses as redirects to frontend with error messsages

  // Identify whether the requestor is logged in
  // Also returns user data if logged in
  private onIdentify = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.cookies.sessionId as string;
    // No session means not logged in
    if (sessionId == null || Object.keys(sessionId).length === 0) {
      res.json({
        loggedIn: false
      });
      return;
    }

    const token = await DiscordTokenStore.validateSession(sessionId);
    // No token also means not logged in
    if (token == null) {
      res.json({
        loggedIn: false
      });
      return;
    }

    // Get user data from Discord
    const userData = await DiscordRESTHelper.user(token);
    // Trim down to only necessary data
    const userDataResponse = {
      id: userData.id,
      username: userData.username,
      avatar: userData.avatar,
      discriminator: userData.discriminator
    };
    // Return login status and user data as JSON
    res.json({
      loggedIn: true,
      userData: userDataResponse
    });
  }

  // Get guilds that the user is in that have QuoteBot present
  private onGuilds = async (req: Request, res: Response): Promise<void> => {
    const sessionId = req.cookies.sessionId as string;
    // No session means not logged in
    if (sessionId == null || Object.keys(sessionId).length === 0) {
      res.sendStatus(403);
      return;
    }

    const token = await DiscordTokenStore.validateSession(sessionId);
    // No token also means not logged in
    if (token == null) {
      res.sendStatus(403);
      return;
    }

    // Get guilds for user from Discord
    const userGuilds = await DiscordRESTHelper.guilds(token);
    // Get guilds that QuoteBot is in
    const quoteBotGuilds = QuoteBot.discord.guilds.cache;
    // Filter to only guilds that are shared with QuoteBot
    // Trim it down to just the necessary fields
    const guildsResponse = userGuilds
      .filter(g => quoteBotGuilds.has(g.id))
      .map(g => ({
        id: g.id,
        name: g.name,
        admin: new Permissions(g.permissions as PermissionString).has("ADMINISTRATOR")
      }));
    // Return as JSON
    res.json(guildsResponse);
  }

  // Redirect to a Discord OAuth authorization URL
  private onLogin = (req: Request, res: Response): void => {
    // Redirect to authorization URL
    const url = this.generateAuthorizationUrl();
    res.redirect(url);
  };

  // Handle OAuth callback from Discord
  private onOauthCallback = async (req: Request, res: Response): Promise<void> => {
    const authorizationCode = req.query.code as string;
    // If no "code" is present, response is malformed
    if (authorizationCode == null) {
      res.sendStatus(400);
      return;
    }

    try {
      // Try and get the a token with this code
      const sessionId = await DiscordTokenStore.handleTokenAuth(authorizationCode);
      // We get a sessionId back if we succeed
      if (sessionId != null) {
        // Set the session cookie on the response and redirect to the frontend
        res.cookie('sessionId', sessionId);
        res.redirect(FRONTEND_BASE_URL);
      } else {
        // If we didn't get a session ID, something went wrong...
        res.sendStatus(400);
      }
    } catch (e) {
      // Some network error probably
      this.logger.error(`OAuth Token request failed: ${e}`);
      res.sendStatus(500);
    }
  }
  
}

export const RESTServer = new RESTServerImpl();