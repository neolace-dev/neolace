import { InvalidFieldValue, SiteSchemaData, UpdateEntryUseAsPropertySchema } from "neolace/deps/neolace-api.ts";
import { C, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EntryTypeFeature } from "../feature.ts";
import { UseAsPropertyEnabled } from "./UseAsPropertyEnabled.ts";
import { Site } from "neolace/core/Site.ts";
import { EnabledFeature } from "../EnabledFeature.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { UseAsPropertyData } from "./UseAsPropertyData.ts";
import { EntryFeatureData } from "../EntryFeatureData.ts";

const featureType = "UseAsProperty" as const;

export const UseAsProperty = EntryTypeFeature({
    featureType,
    configClass: UseAsPropertyEnabled,
    dataClass: UseAsPropertyData,
    updateFeatureSchema: UpdateEntryUseAsPropertySchema,
    contributeToSchema:  async (mutableSchema: SiteSchemaData, tx: WrappedTransaction, siteId: VNID) => {

        const configuredOnThisSite = await tx.query(C`
            MATCH (et:${EntryType})-[:FOR_SITE]->(:${Site} {id: ${siteId}}),
                  (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${UseAsPropertyEnabled})
            WITH et, config
            OPTIONAL MATCH (config)-[:${UseAsPropertyEnabled.rel.APPLIES_TO}]->(otherEntryType:${EntryType})
            WITH et, otherEntryType
            ORDER BY otherEntryType.name
            RETURN et.id AS entryTypeId, collect(otherEntryType.id) AS appliedToIds
        `.givesShape({entryTypeId: Field.VNID, appliedToIds: Field.List(Field.VNID)}));

        configuredOnThisSite.forEach(config => {
            const entryTypeId: VNID = config.entryTypeId;
            if (!(entryTypeId in mutableSchema.entryTypes)) {
                throw new Error("EntryType not in schema");
            }
            mutableSchema.entryTypes[entryTypeId].enabledFeatures[featureType] = {
                appliesToEntryTypes: config.appliedToIds,
            };
        });
    },
    updateConfiguration: async (entryTypeId: VNID, config: {appliesToEntryTypes: VNID[]}, tx: WrappedTransaction, markNodeAsModified: (vnid: VNID) => void) => {
        const appliesToResult = await tx.query(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (et)-[:${EntryType.rel.HAS_FEATURE}]->(feature:${UseAsPropertyEnabled}:${C(EnabledFeature.label)})
            ON CREATE SET feature.id = ${VNID()}

            WITH feature, site
            UNWIND ${config.appliesToEntryTypes} AS appliesToId
            // Find each new EntryType that this property can be used for, and make sure it's part of the same site:
            MATCH (appliesToET:${EntryType} {id: appliesToId})
            WHERE (appliesToET)-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (feature)-[:${UseAsPropertyEnabled.rel.APPLIES_TO}]->(appliesToET)
        `.RETURN({"appliesToET.id": Field.VNID}));

        if (appliesToResult.length !== config.appliesToEntryTypes.length) {
            throw new InvalidFieldValue([{
                fieldPath: "UpdateEntryTypeFeature.feature.config.appliesToEntryTypes",
                message: "Invalid EntryType ID",
            }]);
        }

        // We need to mark the UseAsPropertyEnabled node as modified:
        const result = await tx.queryOne(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.HAS_FEATURE}]->(feature:${UseAsPropertyEnabled})
        `.RETURN({"feature.id": Field.VNID}));
        markNodeAsModified(result["feature.id"]);

        // Delete any entry types that no longer apply:
        await tx.query(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.HAS_FEATURE}]->(feature:${UseAsPropertyEnabled})
            MATCH (feature)-[rel:${UseAsPropertyEnabled.rel.APPLIES_TO}]->(appliesToET)
            WHERE NOT appliesToET.id IN ${config.appliesToEntryTypes}
            DELETE rel
        `);
    },
    async editFeature(entryId, editData, tx, markNodeAsModified) {
        const changes: Record<string, unknown> = {};
        if (editData.importance !== undefined) {
            changes.importance = editData.importance;
        }
        if (editData.valueType !== undefined) {
            changes.valueType = editData.valueType;
        }
        if (editData.inherits !== undefined) {
            changes.inherits = editData.inherits;
        }
        if (editData.displayAs !== undefined) {
            changes.displayAs = editData.displayAs;
        }

        const result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
            // Note that the code that calls this has already verified that this feature is enabled for this entry type.
            MERGE (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(propData:${UseAsPropertyData}:${C(EntryFeatureData.label)})
            ON CREATE SET
                propData.id = ${VNID()},
                propData.importance = ${UseAsPropertyData.defaultImportance},
                propData.inherits = false
            SET propData += ${changes}
        `.RETURN({"propData.id": Field.VNID}));

        markNodeAsModified(result["propData.id"]);
    },
    /**
     * Load the details of this feature for a single entry.
     */
    // deno-lint-ignore require-await
    async loadData(data, _tx) {
        return {
            importance: data.importance,
            inherits: data.inherits,
            displayAs: data.displayAs,
        };
    }
});
