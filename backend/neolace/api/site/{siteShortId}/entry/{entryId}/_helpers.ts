import { api } from "neolace/api/mod.ts";
import { C, VNID, WrappedTransaction, isVNID, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { getEntryAncestors } from "neolace/core/entry/ancestors.ts";
import { siteCodeForSite } from "neolace/core/Site.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { ComputedFact } from "neolace/core/entry/ComputedFact.ts";
import { parseLookupString } from "neolace/core/query/parse.ts";
import { QueryContext } from "neolace/core/query/context.ts";
import { QueryError } from "neolace/core/query/errors.ts";
import { ConcreteValue, NullValue } from "neolace/core/query/values.ts";


/**
 * Helper function to wrap an async function so that it only runs at most once. If you don't need/call it, it won't run
 * at all.
 */
function computeOnceIfNeeded<ResultType>(doCompute: () => Promise<ResultType>): () => Promise<ResultType> {
    let resultPromise: Promise<ResultType>|undefined = undefined;
    return (): Promise<ResultType> => {
        if (resultPromise === undefined) {
            resultPromise = doCompute();
        }
        return resultPromise;
    };
}


/**
 * A helper function to get an entry
 */
export async function getEntry(vnidOrFriendlyId: VNID|string, siteId: VNID, tx: WrappedTransaction, flags: Set<api.GetEntryFlags> = new Set()): Promise<api.EntryData> {

    // If 'vnidOrFriendlyId' is a VNID, use it as-is; otherwise if it's a friendlyID we need to prepend the site prefix
    const key = isVNID(vnidOrFriendlyId) ? vnidOrFriendlyId : (await siteCodeForSite(siteId)) + vnidOrFriendlyId;

    const entryData = await tx.pullOne(Entry, e => e
        .id
        .name
        .description
        .friendlyId()
        .type(et => et.id.name.contentType.site(s => s.id)),
        {key, }
    ).catch((err) => {
        if (err instanceof EmptyResultError) {
            throw new api.NotFound(`Entry with key "${vnidOrFriendlyId}" not found.`);
        } else {
            throw err;
        }
    });

    // Remove the "site" field from the result
    const result: api.EntryData = {
        ...entryData,
        entryType: {id: entryData.type!.id, name: entryData.type!.name, contentType: entryData.type!.contentType as api.ContentType},
        ancestors: undefined,
        computedFactsSummary: undefined,
    };

    // Make sure the site ID matches:
    if (entryData.type?.site?.id !== siteId) {
        throw new Error("The entry ID specified is from a different site.");
    }

    // We'll need the ancestors of this entry in a couple different cases:
    const getAncestors = computeOnceIfNeeded(() => getEntryAncestors(entryData.id, tx));

    if (flags.has(api.GetEntryFlags.IncludeAncestors)) {
        // Include all ancestors. Not paginated but limited to 100 max.
        result.ancestors = await getAncestors();
    }

    if (flags.has(api.GetEntryFlags.IncludeComputedFactsSummary)) {
        // Include a summary of computed facts for this entry (up to 20 computed facts, with importance < 20)
        const factsToCompute = await getComputedFacts(entryData.id, {tx, summaryOnly: true, limit: 20});
        const context: QueryContext = {tx, siteId, entryId: entryData.id};

        // ** In the near future, we'll need to resolve a dependency graph and compute these in parallel / async. **

        result.computedFactsSummary = [];
        for (const cf of factsToCompute) {
            const value: ConcreteValue = await parseLookupString(cf.expression).getValue(context).then(v => v.makeConcrete()).catch(err => {
                if (err instanceof QueryError) {
                    console.log(`Error: ${err.message}`);
                    return new NullValue();
                } else {
                    throw err;
                }
            });
            result.computedFactsSummary.push({
                id: cf.id,
                label: cf.label,
                value: value.toJSON(),
            });
        }
    }

    return result;
}

async function getComputedFacts(entryId: VNID, options: {tx: WrappedTransaction, summaryOnly: boolean, skip?: number, limit?: number}): Promise<api.ComputedFactData[]> {

    // Neo4j doesn't allow normal query variables to be used for skip/limit so we have to carefully ensure these values
    // are safe (are just plain numbers) then format them for interpolation in the query string as part of the cypher
    // expression (not as variables)
    const skipSafe = C(String(Number(options.skip ?? 0)));
    const limitSafe = C(String(Number(Number(options.limit ?? 100))));

    // We can't use virtual props here because there's no way to limit/paginate them at the moment
    const facts = await options.tx.query(C`
        MATCH (entry:${Entry} {id: ${entryId}})
        MATCH (entry)-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})-[:${EntryType.rel.HAS_COMPUTED_FACT}]->(cf:${ComputedFact})
        ${options.summaryOnly ? C`WHERE cf.importance <= 20` : C``}
        RETURN cf.id AS id, cf.label AS label, cf.expression AS expression, cf.importance AS importance
        ORDER BY cf.importance, cf.label  // This should match ComputedFact.defaultOrderBy
        SKIP ${skipSafe} LIMIT ${limitSafe}
    `.givesShape({
        id: Field.VNID,
        label: Field.String,
        expression: Field.String,
        importance: Field.Int,
    }));

    return facts;
}
