import React from "react";
import * as api from "neolace-api";
import useSWR from "swr";
import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";
import { DraftContextData, useDraft } from "./DraftData";

/**
 * React hook to get the current site's schema, including any edits made within the current draft.
 * @returns
 */
export function useSchema(
    context: { draftContext?: DraftContextData } = {},
): [data: api.SiteSchemaData | undefined, error: api.ApiError | undefined] {
    const { site, siteError } = useSiteData();
    const [draft, unsavedEdits] = useDraft(context);

    const key = `siteSchema:${site.shortId}`;
    const { data: baseSchema, error } = useSWR(key, async () => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the entry
        }
        return await client.getSiteSchema({ siteId: site.shortId });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    // Apply any edits from the draft, if present:
    const schema = React.useMemo(() => {
        if (baseSchema === undefined) {
            // Base schema hasn't loaded yet.
        } else if (draft?.edits || unsavedEdits.length > 0) {
            const edits = [...(draft?.edits ?? []), ...unsavedEdits];
            const schema = api.applyEditsToSchema(baseSchema, edits);
            return schema;
        } else {
            return baseSchema;
        }
    }, [baseSchema, draft?.edits, unsavedEdits]);

    return [schema, error];
}
