import { SiteSchemaData, UpdateHeroEntryImageSchema } from "neolace/deps/neolace-api.ts";
import { C, Field, VNID, WrappedTransaction } from "neolace/deps/vertex-framework.ts";
import { EntryType } from "neolace/core/schema/EntryType.ts";
import { EntryTypeFeature } from "../feature.ts";
import { HeroImageFeatureEnabled } from "./HeroImageFeatureEnabled.ts";
import { Site } from "neolace/core/Site.ts";
import { EnabledFeature } from "../EnabledFeature.ts";
import { Entry } from "neolace/core/entry/Entry.ts";
import { HeroImageData } from "./HeroImageData.ts";
import { EntryFeatureData } from "../EntryFeatureData.ts";
import { getEntryFeatureData } from "../get-feature-data.ts";

const featureType = "HeroImage" as const;

/**
 * The "Hero Image" feature allows each entry of the configured EntryType to display a large image at the top of the
 * entry. The image itself is another entry, whose type must have the "Image" feature enabled.
 */
export const HeroImageFeature = EntryTypeFeature({
    featureType,
    configClass: HeroImageFeatureEnabled,
    dataClass: HeroImageData,
    updateFeatureSchema: UpdateHeroEntryImageSchema,
    async contributeToSchema(mutableSchema: SiteSchemaData, tx: WrappedTransaction, siteId: VNID) {

        const configuredOnThisSite = await tx.query(C`
            MATCH (et:${EntryType})-[:FOR_SITE]->(:${Site} {id: ${siteId}}),
                  (et)-[:${EntryType.rel.HAS_FEATURE}]->(config:${HeroImageFeatureEnabled})
            WITH et, config
            RETURN et.id AS entryTypeId
        `.givesShape({entryTypeId: Field.VNID}));

        configuredOnThisSite.forEach(config => {
            const entryTypeId: VNID = config.entryTypeId;
            if (!(entryTypeId in mutableSchema.entryTypes)) {
                throw new Error("EntryType not in schema");
            }
            mutableSchema.entryTypes[entryTypeId].enabledFeatures[featureType] = {
                /* No detailed configuration at this time */
            };
        });
    },
    async updateConfiguration(entryTypeId: VNID, _config: Record<string, never>, tx: WrappedTransaction, markNodeAsModified: (vnid: VNID) => void) {
        const result = await tx.queryOne(C`
            MATCH (et:${EntryType} {id: ${entryTypeId}})-[:${EntryType.rel.FOR_SITE}]->(site)
            MERGE (et)-[:${EntryType.rel.HAS_FEATURE}]->(feature:${HeroImageFeatureEnabled}:${C(EnabledFeature.label)})
            ON CREATE SET feature.id = ${VNID()}
        `.RETURN({"feature.id": Field.VNID}));

        // We need to mark the HeroImageFeatureEnabled node as modified:
        markNodeAsModified(result["feature.id"]);
    },
    async editFeature(entryId, editData, tx, markNodeAsModified): Promise<void> {
        // Associate the Entry with the HeroImageData node
        const updates: Record<string, unknown> = {}
        if (editData.caption !== undefined) {
            updates.caption = editData.caption;
        }
        const result = await tx.queryOne(C`
            MATCH (e:${Entry} {id: ${entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(et:${EntryType})
            // Note that the code that calls this has already verified that this feature is enabled for this entry type.
            MERGE (e)-[:${Entry.rel.HAS_FEATURE_DATA}]->(heroImageData:${HeroImageData}:${C(EntryFeatureData.label)})
            ON CREATE SET
                heroImageData.id = ${VNID()}
            SET heroImageData += ${updates}
        `.RETURN({"heroImageData.id": Field.VNID}));
        const dataId = result["heroImageData.id"];
        // Associate the HeroImageData with the actual image chosen to be used
        if (editData.heroImageEntryId !== undefined) {
            await tx.query(C`
                MATCH (heroImageData:${HeroImageData} {id: ${dataId}})
                MATCH (entry:${Entry} {id: ${editData.heroImageEntryId}})
                MERGE (heroImageData)-[:${HeroImageData.rel.HAS_HERO_IMAGE}]->(entry)
                WITH heroImageData, entry
                MATCH (heroImageData)-[rel:${HeroImageData.rel.HAS_HERO_IMAGE}]->(oldEntry)
                    WHERE NOT oldEntry = entry
                DELETE rel
            `);
        }

        markNodeAsModified(dataId);
    },

    /**
     * Load the details of this feature for a single entry.
     */
    async loadData(data, tx) {
        const imgEntry = (await tx.pullOne(
            HeroImageData,
            d => d.caption.heroImageEntry(e => e.id),
            {key: data.id},
        )).heroImageEntry;
        if (imgEntry === null) {
            return undefined;
        }

        const imgEntryImageData = await getEntryFeatureData(imgEntry.id, {featureType: "Image", tx});
        if (imgEntryImageData === undefined) {
            return undefined;
        }

        return {
            caption: data.caption ?? "",
            entryId: imgEntry.id,
            imageUrl: imgEntryImageData.imageUrl,
        };
    }
});
