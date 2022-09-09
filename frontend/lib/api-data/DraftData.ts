import React from "react";
import * as api from "neolace-api";
import useSWR, { KeyedMutator } from "swr";
import { client } from "lib/api-client";
import { useSiteData } from "./SiteData";

type DraftDataWithEdits = Required<api.DraftData>;

export interface DraftContextData {
    draftId: api.VNID | "_" | undefined;
    unsavedEdits: ReadonlyArray<api.AnyEdit>;
}

/**
 * In this context, there is a "current draft ID". e.g. when editing a draft
 */
export const DraftContext = React.createContext<DraftContextData>({
    // Default values for this context:
    draftId: undefined,
    /**
     * Edits that have been made in the UI in the browser but not yet saved into the draft (they'll be lost if the
     * browser window is closed).
     */
    unsavedEdits: [],
});

/**
 * React hook to get a draft.
 */
export function useDraft(
    /**
     * The draft data normally comes automatically from a <DraftContext.Provider> in a parent element, but if you need
     * to use this in the same component that *creates* the <DraftContext.Provider>, then you can pass the data about
     * the draft in via this parameter.
     */
    context: { draftContext?: DraftContextData } = {},
): [
    data: DraftDataWithEdits | undefined,
    unsavedEdits: ReadonlyArray<api.AnyEdit>,
    error: api.ApiError | undefined,
    mutate: KeyedMutator<DraftDataWithEdits | undefined>,
] {
    const { site, siteError } = useSiteData();
    const _autoDraftContext = React.useContext(DraftContext);
    const draftContext = context.draftContext || _autoDraftContext;
    const draftId = draftContext.draftId;

    const key = `draft:${site.shortId}:${draftId}`;
    const { data, error, mutate } = useSWR(key, async (): Promise<DraftDataWithEdits | undefined> => {
        if (siteError) {
            throw new api.ApiError("Site Error", 500);
        }
        if (draftId === "_" || draftId === undefined) {
            return undefined;
        }
        if (!api.isVNID(draftId)) {
            throw new api.ApiError("Not a valid VNID", 500);
        }
        if (!site.shortId) {
            return undefined; // We need to wait for the siteId before we can load the draft
        }
        return await client.getDraft(draftId, {
            flags: [
                api.GetDraftFlags.IncludeEdits,
            ] as const,
            siteId: site.shortId,
        });
    }, {
        // refreshInterval: 10 * 60_000,
    });

    return [data, draftContext.unsavedEdits, error, mutate];
}
