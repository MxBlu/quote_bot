import { Logger } from "bot-framework";
import { OAuth2Routes } from "discord-api-types/v9";
import { Request, Response } from "express";

import { DISCORD_REST_OAUTH_SCOPE, REST_SERVER_BASE_URL } from "../constants/constants.js";
import { QuoteBot } from "../modules/quotebot.js";

// Redirect to a Discord OAuth authorization URL
export class LoginRoute {
  logger: Logger;

  constructor() {
    this.logger = new Logger("LoginRoute");
  }

  public async handle(req: Request, res: Response): Promise<void> {
    // Redirect to authorization URL
    const url = this.generateAuthorizationUrl();
    res.redirect(url);
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

}