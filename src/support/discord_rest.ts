import { REST } from "@discordjs/rest";
import { APIUser, Routes } from "discord-api-types/v9";

// To reduce Discord REST API usage all over the place
export class DiscordRESTHelper {

    public static async user(token: string): Promise<APIUser> {
        const client = new REST({ version: '9' }).setToken(token);
        const response = await client.get(Routes.user(), { authPrefix: "Bearer" });
        return response as APIUser;
    } 

}