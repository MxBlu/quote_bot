import { Logger } from "bot-framework";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";

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
    // Add error handler
    this.server.use(this.onError);

    this.server.listen(port);
    this.logger.debug(`Server running on port ${port}`);
  }

  private addRoutes(): void {
    const identifyRoute = new IdentifyRoute();
    const guildsRoute = new GuildsRoute();
    const loginRoute = new LoginRoute();
    const oauthCallbackRoute = new OAuthCallbackRoute();

    this.server.get('/identify', identifyRoute.handle.bind(identifyRoute));
    this.server.get('/guilds', guildsRoute.handle.bind(guildsRoute));
    this.server.get('/login', loginRoute.handle.bind(loginRoute));
    this.server.get('/oauth/callback', oauthCallbackRoute.handle.bind(oauthCallbackRoute));
  }
  
  // Middleware

  private onRequest = (req: Request, res: Response, next: NextFunction): void => {
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
}

export const RESTServer = new RESTServerImpl();