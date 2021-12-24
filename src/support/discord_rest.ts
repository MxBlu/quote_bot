import { REST } from "@discordjs/rest";
import { APIGuild, APIUser, Routes } from "discord-api-types/v9";

// To reduce Discord REST API usage all over the place
export class DiscordRESTHelper {

    public static async user(token: string): Promise<APIUser> {
        return await this.get(token, Routes.user()) as APIUser;
    }

    public static async guilds(token: string): Promise<APIGuild[]> {
        return await this.get(token, Routes.userGuilds()) as APIGuild[];
    }

    private static async get(token: string, route: `/${string}`): Promise<unknown> {
        const client = new REST({ version: '9' }).setToken(token);
        const response = await client.get(route, { authPrefix: "Bearer" });
        return response;
    }

}