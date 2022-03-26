import { Logger } from "bot-framework";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import { ChannelsRoute } from "../rest/channels_route.js";

import { GuildsRoute } from "../rest/guilds_route.js";
import { IdentifyRoute } from "../rest/identify_route.js";
import { LoginRoute } from "../rest/login_route.js";
import { OAuthCallbackRoute } from "../rest/oauthcallback_route.js";
import { QuoteBotDependency } from "./quotebot.js";

// TODO: Send error responses as redirects to frontend with error messsages
class RESTServerImpl {
  server: Application;

  logger: Logger;

  constructor() {
    this.logger = new Logger("RESTServer");
  }

  public async init(port: number): Promise<void> {
    // We need QuoteBot for the Discord session
    await QuoteBotDependency.await();

    this.server = express();

    // Add middleware - logging and server state
    this.server.use(cors({
      origin: true, // TODO: Make origin strict in production
      credentials: true
    }));
    this.server.use(this.onRequest);
    this.server.use(cookieParser());
    // Create routes 
    this.addRoutes();
    // Add unknown route handler
    this.server.use(this.onUnknownRoute);
    // Add error handler
    // TODO: Fix, not working
    this.server.use(this.onError);

    // Start server, handling only IPv4
    this.server.listen(port, "0.0.0.0");
    this.logger.info(`Server running on port ${port}`);
  }

  private addRoutes(): void {
    const channelsRoute = new ChannelsRoute();
    const identifyRoute = new IdentifyRoute();
    const guildsRoute = new GuildsRoute();
    const loginRoute = new LoginRoute();
    const oauthCallbackRoute = new OAuthCallbackRoute();

    this.server.get('/channels/:guild', channelsRoute.handle.bind(channelsRoute));
    this.server.get('/identify', identifyRoute.handle.bind(identifyRoute));
    this.server.get('/guilds', guildsRoute.handle.bind(guildsRoute));
    this.server.get('/login', loginRoute.handle.bind(loginRoute));
    this.server.get('/oauth/callback', oauthCallbackRoute.handle.bind(oauthCallbackRoute));
  }
  
  // Middleware

  private onRequest = (req: Request, res: Response, next: NextFunction): void => {
    // Log request paths with IPs
    this.logger.info(`Request: ${req.path} - ${req.ip}`);
    next();
  };

  private onError = (err: Error, req: Request, res: Response) => {
    // Log the error and return a 500
    this.logger.error(`Error processing request: ${req.path} - ${err.name}: ${err.message}`);
    res.sendStatus(500);
  }

  private onUnknownRoute = (req: Request, res: Response): void => {
    // If we don't have a specific handler for the route, send a 404
    res.sendStatus(404);
  };
}

export const RESTServer = new RESTServerImpl();