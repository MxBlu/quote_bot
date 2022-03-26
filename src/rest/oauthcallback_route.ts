import { Logger } from "bot-framework";
import { Request, Response } from "express";

import { FRONTEND_BASE_URL } from "../constants/constants.js";
import { SessionStore } from "../support/session_store.js";

// Handle OAuth callback from Discord
export class OAuthCallbackRoute {
    logger: Logger;

    constructor() {
      this.logger = new Logger("OAuthCallbackRoute");
    }

  public async handle(req: Request, res: Response): Promise<void> {
    const authorizationCode = req.query.code as string;
    // If no "code" is present, response is malformed
    if (authorizationCode == null) {
      res.sendStatus(400);
      return;
    }

    try {
      // Try and get the a token with this code
      const sessionId = await SessionStore.handleTokenAuth(authorizationCode);
      // We get a sessionId back if we succeed
      if (sessionId != null) {
        // Set the session cookie on the response and redirect to the frontend
        res.cookie('sessionId', sessionId, { secure: true, sameSite: "none" });
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