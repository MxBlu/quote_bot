import { Logger } from "bot-framework";
import { ChannelType } from "discord.js";
import { Request, Response } from "express";

import { QuoteBot } from "../modules/quotebot.js";
import { SessionStore } from "../support/session_store.js";

// Interface for response from ChannelsRoute
export interface ChannelsRouteResponse {
  id: string;
  name: string;
}

// Get channels for the guild that the user can see
export class ChannelsRoute {
  logger: Logger;

  constructor() {
    this.logger = new Logger("ChannelsRoute");
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

    // Get guild out of request params
    const guildId = req.params.guild;
    if (guildId == null || guildId == "") {
        // Missing guild ID
        res.sendStatus(400);
        return;
    }

    if (!session.guilds.some(g => guildId == g.id)) {
      // Requesting channels for a guild that the user is not in
      res.sendStatus(403);
      return;
    }

    // Get Guild, GuildMember (for current user) and Channels on guild
    const guild = await QuoteBot.discord.guilds.fetch(guildId);
    const guildMember = await guild.members.fetch(session.user.id);
    const channels = await guild.channels.fetch();
    
    // Trim down to only relevant channels
    const channelsResponse = channels
      .filter(c => c.type == ChannelType.GuildText) // Channels that are text channels
      .filter(c => c.permissionsFor(guildMember).has("ViewChannel")) // Filter to only channels user can see
      .map(c => ({  // Map to ID and name
        id: c.id,
        name: c.name
      }));
    // Return as JSON
    res.json(channelsResponse);
  }
}