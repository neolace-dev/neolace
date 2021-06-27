import { config } from "neolace/app/config.ts";


// A mock client - temporary
class KeratinAuthNClient {
    constructor(_args: unknown) {}

    createUser(_args: {username: string}) {
        return {accountId: Math.floor(Math.random() * 100_000)};
    }

    // deno-lint-ignore require-await
    async validateSessionToken(_token: string): Promise<{accountId: number}|undefined> {
        return undefined;
    }

    // deno-lint-ignore require-await
    async requestPasswordlessLogin(_args: {username: string}) {
        return undefined;
    }
}


export const authClient = new KeratinAuthNClient({
    appDomain: "localhost:5555",
    authnUrl: config.authnUrl,
    authnPrivateUrl: config.authnPrivateUrl,
    username: config.authnApiUsername,
    password: config.authnApiPassword,
});
