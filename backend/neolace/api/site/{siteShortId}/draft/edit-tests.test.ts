import {
    api,
    assert,
    assertEquals,
    assertInstanceOf,
    assertRejects,
    getClient,
    group,
    setTestIsolation,
    test,
} from "neolace/api/tests.ts";
import { VNID } from "neolace/deps/vertex-framework.ts";

/** Helper function to apply edits for this test case, using an API client. */
async function doEdit(client: api.NeolaceApiClient, ...edits: api.AnyEdit[]): Promise<void> {
    const draftDefaults = { title: "A Test Draft", description: null };
    return client.createDraft({
        ...draftDefaults,
        edits,
    }).then((draft) => client.acceptDraft(draft.id));
}

group("edit tests", () => {
    const defaultData = setTestIsolation(setTestIsolation.levels.DEFAULT_ISOLATED);
    const ponderosaEntryId = defaultData.entries.ponderosaPine.id;

    group("Setting entry name and description", () => {
        test("We can change an entry's name and description", async () => {
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            const before = await client.getEntry(ponderosaEntryId);
            await doEdit(
                client,
                { code: api.SetEntryName.code, data: { entryId: ponderosaEntryId, name: "New Name 👍" } },
                { code: api.SetEntryDescription.code, data: { entryId: ponderosaEntryId, description: "👍👍👍" } },
            );
            const after = await client.getEntry(ponderosaEntryId);
            assertEquals(before.name, defaultData.entries.ponderosaPine.name);
            assertEquals(after.name, "New Name 👍");
            assertEquals(before.description, defaultData.entries.ponderosaPine.description);
            assertEquals(after.description, "👍👍👍");
        });

        test("We can NOT change another site's entry's name", async () => {
            // Get an API client, logged in to the *home site*, not to plant DB
            const client = await getClient(defaultData.users.admin, defaultData.otherSite.shortId);
            await assertRejects(
                () =>
                    doEdit(client, {
                        code: api.SetEntryName.code,
                        data: { entryId: ponderosaEntryId, name: "New Name 👍" },
                    }),
                (err: unknown) => {
                    assertInstanceOf(err, api.InvalidEdit);
                    assertEquals(err.context.entryId, ponderosaEntryId);
                    assertEquals(err.message, `Cannot set change the entry's name - entry does not exist.`);
                },
            );
        });

        test("We can NOT change another site's entry's description", async () => {
            // Get an API client, logged in to the *home site*, not to plant DB
            const client = await getClient(defaultData.users.admin, defaultData.otherSite.shortId);
            await assertRejects(
                () =>
                    doEdit(client, {
                        code: api.SetEntryDescription.code,
                        data: { entryId: ponderosaEntryId, description: "Desc 👍" },
                    }),
                (err: unknown) => {
                    assertInstanceOf(err, api.InvalidEdit);
                    assertEquals(err.context.entryId, ponderosaEntryId);
                    assertEquals(err.message, `Cannot set change the entry's description - entry does not exist.`);
                },
            );
        });
    });

    group("Adding a new property value", () => {
        test("Adding property values to an entry", async () => {
            // This test will add multiple property values to the entry "Jeffrey Pine"
            const entryId = defaultData.entries.jeffreyPine.id;
            // The property we'll be editing is "Other names"
            const propertyId = defaultData.schema.properties._propOtherNames.id;
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const getEntry = () =>
                client.getEntry(entryId, { flags: [api.GetEntryFlags.IncludePropertiesSummary] as const });
            const before = await getEntry();
            const getValue = (entry: typeof before) =>
                entry.propertiesSummary.find((p) => p.propertyId === propertyId)?.value;

            // At first, the property has no value:
            assertEquals(getValue(before), undefined);

            // Now we give it a value:
            await doEdit(client, {
                code: api.AddPropertyValue.code,
                data: {
                    entryId,
                    propertyId,
                    propertyFactId: VNID(),
                    valueExpression: `"Jeffrey's pine"`,
                },
            });
            const valueAfterEdit1 = getValue(await getEntry());
            assert(valueAfterEdit1?.type === "Annotated");
            assert(valueAfterEdit1.value.type === "String");
            assertEquals(valueAfterEdit1.value.value, "Jeffrey's pine");
            assertEquals(valueAfterEdit1.annotations.note, { type: "InlineMarkdownString", value: "" });
            assertEquals(valueAfterEdit1.annotations.rank, { type: "Integer", value: "1" }); // Is a string since our number type is bigint, which doesn't JSON serialize as Number

            // Now we give it a second value:

            await doEdit(client, {
                code: api.AddPropertyValue.code,
                data: {
                    entryId,
                    propertyId,
                    propertyFactId: VNID(),
                    valueExpression: `"pin de Jeffrey"`,
                    note: "(French)",
                },
            });
            const valueAfterEdit2 = getValue(await getEntry());
            assert(valueAfterEdit2?.type === "Page");
            assertEquals(valueAfterEdit2.values.length, 2);
            // The first value is unchanged:
            assert(valueAfterEdit2.values[0].type === "Annotated");
            assert(valueAfterEdit2.values[0].value.type === "String");
            assertEquals(valueAfterEdit2.values[0].value.value, "Jeffrey's pine");
            // The second value is added:
            assert(valueAfterEdit2.values[1].type === "Annotated");
            assert(valueAfterEdit2.values[1].value.type === "String");
            assertEquals(valueAfterEdit2.values[1].value.value, "pin de Jeffrey");
            // The second value has a rank of 2 automatically assigned:
            assertEquals(valueAfterEdit2.values[1].annotations.rank, { type: "Integer", value: "2" });
            assertEquals(valueAfterEdit2.values[1].annotations.note, {
                type: "InlineMarkdownString",
                value: "(French)",
            });
        });

        test("When we create a relationship to a non-existent entry, we get a relevant error message.", async () => {
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            const propertyId = defaultData.schema.properties._hasPart.id;

            // delete a property fact that does not exist:
            await assertRejects(
                () =>
                    doEdit(client, {
                        code: api.AddPropertyValue.code,
                        data: {
                            entryId: ponderosaEntryId,
                            propertyId,
                            propertyFactId: VNID(),
                            /** Value expression: a lookup expression giving the value */
                            valueExpression: "[[/entry/_FOOBAR]]",
                        },
                    }),
                (err: unknown) => {
                    assertInstanceOf(err, api.InvalidEdit);
                    assertEquals(err.context.propertyId, propertyId);
                    assertEquals(err.context.toEntryId, VNID("_FOOBAR"));
                    assertEquals(err.context.fromEntryId, ponderosaEntryId);
                    assertEquals(
                        err.message,
                        `Target entry not found - cannot set that non-existent entry as a relationship property value.`,
                    );
                },
            );
        });
    });

    group("Updating a property value", () => {
        test("We can update an entry's property value", async () => {
            // This test will change the scientific name of "Ponderosa Pine"
            const entryId = defaultData.entries.ponderosaPine.id;
            const propertyId = defaultData.schema.properties._propScientificName.id;
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const getEntry = () =>
                client.getEntry(entryId, { flags: [api.GetEntryFlags.IncludePropertiesSummary] as const });
            const before = await getEntry();
            const getValue = (entry: typeof before) =>
                entry.propertiesSummary.find((p) => p.propertyId === propertyId)?.value;

            // At first, the property is "Pinus ponderosa":
            const beforeValue = getValue(before);
            assert(beforeValue?.type === "Annotated");
            // Because "Scientific name" gets italicized automatically, we have to read the "plainValue":
            assertEquals(beforeValue.annotations.plainValue, { type: "String", value: "Pinus ponderosa" });
            assert(beforeValue.annotations.propertyFactId.type === "String");
            const propertyFactId = VNID(beforeValue.annotations.propertyFactId.value);

            // Now we change the property value:
            await doEdit(client, {
                code: api.UpdatePropertyValue.code,
                data: {
                    propertyFactId,
                    valueExpression: `"New value"`,
                },
            });

            const afterValue = getValue(await getEntry());
            assert(afterValue?.type === "Annotated");
            assertEquals(afterValue.annotations.plainValue, { type: "String", value: "New value" });
        });

        test("We can update an entry's relationship property value", async () => {
            // This test will change the parent genus of "Ponderosa Pine"
            const entryId = defaultData.entries.ponderosaPine.id;
            const propertyId = defaultData.schema.properties._parentGenus.id;
            // Get an API client, logged in to PlantDB as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);

            const getEntry = () =>
                client.getEntry(entryId, { flags: [api.GetEntryFlags.IncludePropertiesSummary] as const });
            const before = await getEntry();
            const getValue = (entry: typeof before) =>
                entry.propertiesSummary.find((p) => p.propertyId === propertyId)?.value;

            // At first, the property is "Pinus ponderosa":
            const beforeValue = getValue(before);
            assert(beforeValue?.type === "Annotated");
            // The original value of "Parent Genus" is "genus Pinus":
            assertEquals(beforeValue.value, { type: "Entry", id: defaultData.entries.genusPinus.id });
            assert(beforeValue.annotations.propertyFactId.type === "String");
            const propertyFactId = VNID(beforeValue.annotations.propertyFactId.value);

            // Now we change the property value:
            const newGenusId = defaultData.entries.genusThuja.id;
            await doEdit(client, {
                code: api.UpdatePropertyValue.code,
                data: {
                    propertyFactId,
                    valueExpression: `[[/entry/${newGenusId}]]`,
                },
            });

            const afterValue = getValue(await getEntry());
            assert(afterValue?.type === "Annotated");
            assertEquals(afterValue.value, { type: "Entry", id: newGenusId });
            // And to test that the "direct relationships" were updated correctly, we use ancestors(), because the
            // ancestors() function doesn't check PropertyFact entries but rather uses the direct IS_A relationships.
            const result = await client.evaluateLookupExpression(`[[/entry/${entryId}]].ancestors().first()`);
            assert(result.resultValue.type === "Annotated");
            assertEquals(result.resultValue.value, { type: "Entry", id: newGenusId });
        });
    });

    group("Deleting properties", () => {
        test("We can delete a property on an entry", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            const originalEntry = await client.getEntry(
                defaultData.entries.genusCupressus.id,
                { flags: [api.GetEntryFlags.IncludePropertiesSummary] as const },
            );
            const propertyFact = originalEntry.propertiesSummary?.find(
                (e) => e.propertyId === defaultData.schema.properties._parentFamily.id,
            );

            //  check the property exists
            assert(propertyFact?.value.type === "Annotated");
            assert(propertyFact?.value.value.type === "Entry");
            assertEquals(propertyFact?.value.value.id, defaultData.entries.familyCupressaceae.id);

            // now delete the property
            await doEdit(client, {
                code: api.DeletePropertyValue.code,
                data: {
                    propertyFactId: VNID((propertyFact.value.annotations.propertyFactId as api.StringValue).value),
                },
            });

            // check that the property got deleted.
            const modifiedEntry = await client.getEntry(
                defaultData.entries.genusCupressus.id,
                { flags: [api.GetEntryFlags.IncludePropertiesSummary] as const },
            );
            const newPropertyFact = modifiedEntry.propertiesSummary?.find(
                (e) => e.propertyId === defaultData.schema.properties._parentFamily.id,
            );

            assertEquals(newPropertyFact, undefined);

            // check the length of property summary that it decreased by three (minus deleted rel and auto-generated
            // rels from parent)

            assertEquals(modifiedEntry.propertiesSummary?.length, originalEntry.propertiesSummary!.length - 3);
        });

        test("When we delete non-existent relationship, raises an error.", async () => {
            // Get an API client, logged in as a bot that belongs to an admin
            const client = await getClient(defaultData.users.admin, defaultData.site.shortId);
            // make new id which is SUPPOSEDLY not used by any property, or so we are told
            const newVNID = VNID();

            // now delete the property fact that does not exist:
            await assertRejects(
                () => doEdit(client, { code: api.DeletePropertyValue.code, data: { propertyFactId: (newVNID) } }),
                (err: unknown) => {
                    assertInstanceOf(err, api.InvalidEdit);
                    assertEquals(err.context.propertyFactId, newVNID);
                    assertEquals(err.message, `That property fact does not exist on this site.`);
                },
            );
        });
    });
});
