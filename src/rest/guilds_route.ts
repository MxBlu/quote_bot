import { Logger } from "bot-framework";
import { Permissions, PermissionString } from "discord.js";
import { Request, Response } from "express";

import { QuoteBot } from "../modules/quotebot.js";
import { SessionStore } from "../support/session_store.js";

// Interface for response from GuildsRoute
export interface GuildsResponse {
  id: string;
  name: string;
  admin: boolean;
}

// Get guilds that the user is in that have QuoteBot present
export class GuildsRoute {
  logger: Logger;

  constructor() {
    this.logger = new Logger("GuildsRoute");
  }

  public async handle(req: Request, res: Response): Promise<void> {
    const sessionId = req.cookies.sessionId as string;
    // No session means not logged in
    if (sessionId == null || Object.keys(sessionId).length === 0) {
      res.sendStatus(403);
      return;
    }

    const session = await SessionStore.validateSession(sessionId);
    // No token also means not logged in
    if (session == null) {
      res.sendStatus(403);
      return;
    }

    // Get guilds from the session
    const userGuilds = session.guilds;
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
}