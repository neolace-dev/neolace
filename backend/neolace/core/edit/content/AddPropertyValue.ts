import { C, EmptyResultError, Field } from "neolace/deps/vertex-framework.ts";
import { AddPropertyValue, InvalidEdit, PropertyType } from "neolace/deps/neolace-api.ts";
import { defineImplementation } from "neolace/core/edit/implementations.ts";
import { Entry, EntryType, Property, PropertyFact, Site } from "neolace/core/mod.ts";
import { directRelTypeForPropertyType, parseLookupExpressionToEntryId } from "neolace/core/entry/PropertyFact.ts";

export const doAddPropertyValue = defineImplementation(AddPropertyValue, async (tx, data, siteId) => {
    const valueExpression = data.valueExpression;
    const updatedPropertyFactFields: Record<string, unknown> = {
        valueExpression,
        note: data.note ?? "",
        slot: data.slot ?? "",
    };
    if (data.rank !== undefined) {
        updatedPropertyFactFields.rank = BigInt(data.rank);
    }

    // Validate the entry ID, property ID, and ensure they're part of the current site.
    // Then create the new property fact.
    let baseData;
    try {
        baseData = await tx.queryOne(C`
            MATCH (site:${Site} {id: ${siteId}})
            MATCH (entry:${Entry} {id: ${data.entryId}})-[:${Entry.rel.IS_OF_TYPE}]->(entryType:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(site)
            // Ensure that the property (still) applies to this entry type:
            MATCH (property:${Property} {id: ${data.propertyId}})-[:${Property.rel.APPLIES_TO_TYPE}]->(entryType)
            // Set the rank automatically by default:
            OPTIONAL MATCH (entry)-[:${Entry.rel.PROP_FACT}]->(existingPf:${PropertyFact})-[:${PropertyFact.rel.FOR_PROP}]->(property)
            WITH entry, property, max(existingPf.rank) AS maxCurrentRank
            // Create the new property fact:
            CREATE (entry)-[:${Entry.rel.PROP_FACT}]->(pf:${PropertyFact} {id: ${data.propertyFactId}})
            CREATE (pf)-[:${PropertyFact.rel.FOR_PROP}]->(property)
            SET pf.rank = CASE WHEN maxCurrentRank IS NULL THEN 1 ELSE maxCurrentRank + 1 END
            SET pf += ${updatedPropertyFactFields}
        `.RETURN({
            "property.type": Field.String,
        }));
    } catch (err) {
        if (err instanceof EmptyResultError) {
            // Was the property not found, or does it not apply to that entry type?
            const checkProperties = await tx.query(C`
                MATCH (property:${Property} {id: ${data.propertyId}})-[:${Property.rel.FOR_SITE}]->(site:${Site} {id: ${siteId}})
            `.RETURN({ "property.name": Field.String }));
            if (checkProperties.length === 0) {
                throw new InvalidEdit(
                    AddPropertyValue.code,
                    { propertyId: data.propertyId },
                    `Property with ID ${data.propertyId} was not found in the site's schema.`,
                );
            } else {
                // If we get there, the property exists but doesn't apply to that entry type.
                const propertyName = checkProperties[0]["property.name"];
                throw new InvalidEdit(
                    AddPropertyValue.code,
                    { propertyId: data.propertyId, propertyName, entryId: data.entryId },
                    `The "${propertyName}" property does not apply to entries of that type.`,
                );
            }
        } else {
            throw err;
        }
    }
    const propType = baseData["property.type"] as PropertyType;
    const directRelType = directRelTypeForPropertyType(propType); // If this is a relationship property, there is a relationship of this type directly between two entries
    if (directRelType !== null) {
        // This is a relationship property, verify that the Entry it will be pointing to exists and is
        // part of the same site.
        // There is a relationship FROM the current entry TO the entry with this id:
        const toEntryId = parseLookupExpressionToEntryId(valueExpression);

        // We also need to create/update a direct (Entry)-[rel]->(Entry) relationship on the graph.
        try {
            await tx.queryOne(C`
                MATCH (entry:${Entry} {id: ${data.entryId}})
                // Match the target entry and make sure it's part of the same site:
                MATCH (toEntry:${Entry} {id: ${toEntryId}})-[:${Entry.rel.IS_OF_TYPE}]->(:${EntryType})-[:${EntryType.rel.FOR_SITE}]->(:${Site} {id: ${siteId}})
                MATCH (pf:${PropertyFact} {id: ${data.propertyFactId}})
                CREATE (entry)-[rel:${directRelType}]->(toEntry)
                SET pf.directRelNeo4jId = id(rel)
            `.RETURN({ "pf.directRelNeo4jId": Field.BigInt }));
        } catch (err) {
            if (err instanceof EmptyResultError) {
                throw new InvalidEdit(
                    AddPropertyValue.code,
                    {
                        propertyId: data.propertyId,
                        toEntryId: toEntryId,
                        fromEntryId: data.entryId,
                    },
                    `Target entry not found - cannot set that non-existent entry as a relationship property value.`,
                );
            } else {
                throw err; // Other unknown internal error.
            }
        }
    }

    return {
        // Changing a property value always counts as modifying the entry:
        modifiedNodes: [data.entryId, data.propertyFactId],
    };
});
