import { Logger } from "bot-framework";
import { Request, Response } from "express";

import { DiscordRESTHelper } from "../support/discord_rest.js";
import { DiscordTokenStore } from "../support/discord_token_store.js";

// Identify whether the requestor is logged in
// Also returns user data if logged in
export class IdentifyRoute {
  logger: Logger;

  constructor() {
    this.logger = new Logger("IdentifyRoute");
  }

  public async handle(req: Request, res: Response): Promise<void> {
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

}