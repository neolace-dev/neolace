import * as KeratinAuthN from 'keratin-authn';
import { API_SERVER_URL, IN_BROWSER } from 'lib/config';
import { NeolaceApiClient, NotFound} from 'neolace-api';
import { AsyncCache } from './async-cache';

/** Refresh the session token if needed */
const getSessionPromise = () => {
    if (IN_BROWSER && KeratinAuthN.session()) {
        // There is a session token saved locally, but we don't know if it's still valid.
        return KeratinAuthN.restoreSession().catch(() => {
            console.error("Session token was invalid, or an error occurred while refreshing it.");
            // If we're unable to restore/validate the sesion,
            // clear the session cookie so we don't try to log in again.
            KeratinAuthN.logout().finally(() => {});
        });
    }
    // There is no session saved locally, or we're running on the server; either way, no user is logged in.
    return Promise.resolve();
}

/**
 * A promise that will be resolved when the session token is either validated or deleted.
 * Wait for this promise before checking/using KeratinAuthN.session()
 */
export const apiSessionPromise: Promise<void> = getSessionPromise();

/**
 * Helper that defines how to make authenticated API calls to the Neolace API
 */
async function getExtraHeadersForRequest() {
    if (IN_BROWSER) {
        // Validate the API token if needed, then add it to the request:
        try {
            await apiSessionPromise;
        } catch { console.error(`apiSessionPromise rejected; shouldn't happen.`); }
        if (KeratinAuthN.session()) {
            // Add the "Authorization" header to every REST API request.
            return {
                Authorization: `Bearer ${KeratinAuthN.session()}`,
            };
        }
    }
    return {};
}

export const client = new NeolaceApiClient({
    basePath: API_SERVER_URL,
    fetchApi: IN_BROWSER ? window.fetch.bind(window) : require('node-fetch'),
    getExtraHeadersForRequest,
});

export interface SiteData {
    name: string;
    domain: string;
    shortId: string;
}

const siteDataCache = new AsyncCache<string, SiteData>(
    async (domain) => {
        const siteData = await client.getSite({domain,});
        return {
            name: siteData.name,
            domain: siteData.domain,
            shortId: siteData.shortId,
        };
    },
    5 * 60_000,  // timeout is 5 minutes
);

export async function getSiteData(domain: string): Promise<SiteData|null> {
    try {
        // If the site has been previously retrieved, this cache will always return the cached value immediately.
        // (Occasionally it will be refreshed in the background, but we still get an immediate result here.)
        return await siteDataCache.get(domain);
    } catch (err) {
        if (err instanceof NotFound) {
            return null;
        }
    }
}

// Store the API client on the global window object for development purposes.
if (IN_BROWSER) {
    // deno-lint-ignore no-explicit-any
    (window as any).client = client;
}
