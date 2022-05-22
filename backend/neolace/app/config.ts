/**
 * Configuration of the Neolace backend application
 */

// What type of environment this is: development, production, or testing
export const environment = (Deno.env.get("ENV_TYPE") as "production" | "development" | "test" | undefined) ||
    "development";
if (!["production", "development", "test"].includes(environment)) {
    throw new Error(`Invalid ENV_TYPE: ${environment}`);
}

function defaultTo<T>(value: T, { production, test }: { production?: T; test?: T }): T {
    if (environment === "production") {
        return production ?? value;
    } else if (environment === "test") {
        return test ?? value;
    }
    return value;
}

export const config = (() => {
    // Default configuration:
    const config = {
        // Port to listen on
        port: defaultTo(5554, { test: 4444 }),
        // Full URL at which the REST API is available
        apiUrl: defaultTo("http://local.neolace.net:5554", { test: "http://localhost:4444" }),

        /**
         * URL for the Realm admin UI. This is where you can create a new site, register a user account, etc.
         */
        realmAdminUrl: defaultTo("http://local.neolace.net:5555", { test: "http://frontend-realm-admin" }),
        realmName: defaultTo("Neolace Dev", { production: "Neolace", test: "Neolace Test" }),
        /** URL to page with information about the overall realm. Could be a site's home page. */
        realmURL: "https://www.neolace.com",
        realmPhysicalAddress: "317 - 161 West Georgia St.\nVancouver, BC  Canada",

        // URL of the Neo4j server
        neo4jUrl: defaultTo("bolt://localhost:7687", { test: "bolt://localhost:4687" }),
        neo4jUser: "neo4j",
        neo4jPassword: defaultTo("neolace", { production: "\u0000 setme!!" }),
        // Configuration of the TypeSense (search) server:
        typeSenseHost: "localhost",
        typeSensePort: defaultTo(5556, { production: 8108 }),
        typeSenseProtocol: "http",
        typeSenseApiKey: "typesensedevkey",
        typeSensePublicEndpoint: "http://localhost:5556",
        // Should debug logs be printed to stdout?
        debugLogging: defaultTo(true, { production: false }),
        // Public URL of the authentication microservice (Keratin AuthN)
        authnUrl: defaultTo("http://localhost:5552", { test: "http://localhost:5552" }),
        // Private URL of the authentication microservice (Keratin AuthN)
        authnPrivateUrl: defaultTo("http://localhost:5559", { test: "http://localhost:4449" }),
        // Username for making private API requests to the authentication microservice (Keratin AuthN)
        authnApiUsername: "authn",
        // Password for making private API requests to the authentication microservice (Keratin AuthN)
        authnApiPassword: "neolace",

        // Which email provider to use for sending transactional email. See deno-mailer.ts.
        mailProvider: "console", // By default just log emails to the console.
        // Detailed provider configuration depends on which provider is selected.
        mailProviderConfig: {},
        /** Address which most system transactional emails will come from. */
        mailFromAddress: "neolace@example.com",

        // S3-compatible object store used for assets like images, PDFs, etc.
        objStoreEndpointURL: "http://localhost:9000/",
        objStoreRegion: "dev-region",
        // The default bucket names below are created by the entrypoint in docker-compose.yml
        objStoreBucketName: defaultTo("neolace-objects", { test: "neolace-test-objects" }),
        objStoreAccessKey: "AKIA_NEOLACE_DEV",
        objStoreSecretKey: "neolace123",
        objStorePublicUrlPrefix: defaultTo("http://localhost:9000/neolace-objects", {
            test: "http://localhost:9000/neolace-test-objects",
        }),
        // If set, this prefix will be used for images, instead of objStorePublicUrlPrefix. Useful for CDN+imgproxy.
        objStorePublicUrlPrefixForImages: "",
        // Redis is used as a cache and a message queue
        redisHostname: "localhost",
        redisPassword: defaultTo("devpassword", { production: "" }),
        redisDatabaseNumber: defaultTo(0, { test: 1 }),
        redisPort: defaultTo(5553, { production: 6379 }),
        // The system API key is very dangerous and allows a user to do ANYTHING with the REST API, such as delete
        // entire sites. We store only the salted SHA-256 hash of the system API key. It defaults to
        // "SYS_KEY_INSECURE_DEV_KEY" in development and by default is disabled in production. Go to
        // (backend API URL)/auth/system-key to generate a ney key, e.g. http://localhost:5554/auth/system-key for
        // development. Once it is generated, this config setting here must be updated.
        systemApiKeyHash: defaultTo("96dee7f604222fed743cec02d8be06ca531b7187dc96adc3f7d4dcad011025fc", {
            production: "disabled",
        }),

        plugins: [
            { mod: "search" },
        ],
    };
    // Allow defaults to be overriden by environment variables:
    for (const key in config) {
        const value = Deno.env.get(key);
        if (value !== undefined) {
            try {
                // Use JSON parsing to get nicely typed values from env vars:
                // deno-lint-ignore no-explicit-any
                (config as any)[key] = JSON.parse(value);
            } catch (err) {
                // Though JSON parsing will fail if it's just a regular unquoted string:
                if (err instanceof SyntaxError) {
                    // deno-lint-ignore no-explicit-any
                    (config as any)[key] = value; // It's a string value
                } else {
                    throw err;
                }
            }
        }
    }
    // Sanity checks
    const rootUrls = ["realmAdminUrl", "apiUrl", "authnUrl", "authnPrivateUrl"] as const;
    for (const url of rootUrls) {
        if (config[url].endsWith("/")) {
            throw new Error(`${url} must not end with a /`);
        }
    }
    if (environment === "production") {
        // Enforce HTTPS
        if (!config.apiUrl.startsWith("https://")) {
            throw new Error("In production, apiUrl must be https://");
        }
        if (!config.realmAdminUrl.startsWith("https://")) {
            throw new Error("In production, realmAdminUrl must be https://");
        }
    }
    return Object.freeze(config);
})();
